import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  action: 'deposit' | 'withdraw' | 'penalty'
  swearJarId?: string
  amount?: number
  description?: string
  bankAccountId?: string
  metadata?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, swearJarId, amount, description, bankAccountId, metadata }: RequestBody = await req.json()

    if (!action || !swearJarId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, swearJarId, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to the swear jar
    const { data: membership, error: membershipError } = await supabaseClient
      .from('swear_jar_members')
      .select('role, permissions')
      .eq('swear_jar_id', swearJarId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this swear jar' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create transaction based on action
    let transactionData: any = {
      user_id: user.id,
      swear_jar_id: swearJarId,
      amount: amount,
      description: description || `${action.charAt(0).toUpperCase() + action.slice(1)} transaction`,
      type: action,
      status: 'pending',
      metadata: metadata || {}
    }

    if (bankAccountId) {
      transactionData.bank_account_id = bankAccountId
    }

    // For penalties, auto-approve and update jar balance
    if (action === 'penalty') {
      transactionData.status = 'completed'
      transactionData.processed_at = new Date().toISOString()

      // Update swear jar balance
      const { error: balanceError } = await supabaseClient.rpc('update_jar_balance', {
        jar_id: swearJarId,
        amount_change: amount
      })

      if (balanceError) {
        console.error('Error updating jar balance:', balanceError)
      }
    }

    // Insert transaction
    const { data: transaction, error: insertError } = await supabaseClient
      .from('transactions')
      .insert([transactionData])
      .select(`
        *,
        users(id, name, email, avatar),
        swear_jars(id, name, currency),
        bank_accounts(id, institution_name, account_name, mask)
      `)
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction,
        message: `${action.charAt(0).toUpperCase() + action.slice(1)} transaction created successfully`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 