import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  action: 'createLinkToken' | 'exchangeToken' | 'updateBalance' | 'getTransactions' | 'verifyAccount'
  publicToken?: string
  accountId?: string
  startDate?: string
  endDate?: string
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

    const { action, publicToken, accountId, startDate, endDate, metadata }: RequestBody = await req.json()

    // Get Plaid environment variables
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')
    const plaidSecret = Deno.env.get('PLAID_SECRET')
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox'

    if (!plaidClientId || !plaidSecret) {
      return new Response(
        JSON.stringify({ error: 'Plaid configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const plaidBaseUrl = plaidEnv === 'production' 
      ? 'https://production.plaid.com'
      : plaidEnv === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com'

    switch (action) {
      case 'createLinkToken': {
        const linkTokenRequest = {
          client_id: plaidClientId,
          secret: plaidSecret,
          client_name: 'SwearJar',
          country_codes: ['US'],
          language: 'en',
          user: {
            client_user_id: user.id,
          },
          products: ['auth', 'transactions'],
        }

        const response = await fetch(`${plaidBaseUrl}/link/token/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(linkTokenRequest),
        })

        const data = await response.json()

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to create link token', details: data }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, link_token: data.link_token }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'exchangeToken': {
        if (!publicToken) {
          return new Response(
            JSON.stringify({ error: 'Missing publicToken' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const exchangeRequest = {
          client_id: plaidClientId,
          secret: plaidSecret,
          public_token: publicToken,
        }

        const response = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(exchangeRequest),
        })

        const data = await response.json()

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to exchange token', details: data }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get account information
        const accountsRequest = {
          client_id: plaidClientId,
          secret: plaidSecret,
          access_token: data.access_token,
        }

        const accountsResponse = await fetch(`${plaidBaseUrl}/accounts/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accountsRequest),
        })

        const accountsData = await accountsResponse.json()

        if (!accountsResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to get accounts', details: accountsData }),
            { status: accountsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Store bank account information
        const accounts = []
        for (const account of accountsData.accounts) {
          const { data: savedAccount, error: saveError } = await supabaseClient
            .from('bank_accounts')
            .insert([{
              user_id: user.id,
              plaid_account_id: account.account_id,
              plaid_access_token: data.access_token,
              plaid_item_id: data.item_id,
              institution_name: accountsData.item?.institution_id || 'Unknown',
              account_name: account.name,
              account_type: account.type,
              account_subtype: account.subtype,
              mask: account.mask,
              current_balance: account.balances.current || 0,
              available_balance: account.balances.available || 0,
              currency: account.balances.iso_currency_code || 'USD',
              is_active: true,
            }])
            .select()
            .single()

          if (saveError) {
            console.error('Error saving account:', saveError)
          } else {
            accounts.push(savedAccount)
          }
        }

        return new Response(
          JSON.stringify({ success: true, accounts }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 