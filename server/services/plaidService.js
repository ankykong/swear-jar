const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

class PlaidService {
  constructor() {
    // Initialize Plaid configuration
    const configuration = new Configuration({
      basePath: this.getPlaidEnvironment(),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
          'Plaid-Version': '2020-09-14',
        },
      },
    });

    this.client = new PlaidApi(configuration);
  }

  getPlaidEnvironment() {
    switch (process.env.PLAID_ENV) {
      case 'sandbox':
        return PlaidEnvironments.sandbox;
      case 'development':
        return PlaidEnvironments.development;
      case 'production':
        return PlaidEnvironments.production;
      default:
        return PlaidEnvironments.sandbox;
    }
  }

  // Create a link token for Plaid Link
  async createLinkToken(userId, institutionId = null) {
    try {
      const configs = {
        user: {
          client_user_id: userId.toString(),
        },
        client_name: 'SwearJar',
        products: (process.env.PLAID_PRODUCTS || 'transactions,accounts').split(','),
        country_codes: (process.env.PLAID_COUNTRY_CODES || 'US').split(','),
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL,
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings']
          }
        }
      };

      if (institutionId) {
        configs.institution_id = institutionId;
      }

      const createTokenResponse = await this.client.linkTokenCreate(configs);
      return createTokenResponse.data;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw new Error('Failed to create link token');
    }
  }

  // Exchange public token for access token
  async exchangePublicToken(publicToken) {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw new Error('Failed to exchange public token');
    }
  }

  // Get accounts for an access token
  async getAccounts(accessToken) {
    try {
      const response = await this.client.accountsGet({
        access_token: accessToken,
      });

      return response.data.accounts;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  // Get account balances
  async getAccountBalances(accessToken) {
    try {
      const response = await this.client.accountsBalanceGet({
        access_token: accessToken,
      });

      return response.data.accounts;
    } catch (error) {
      console.error('Error fetching account balances:', error);
      throw new Error('Failed to fetch account balances');
    }
  }

  // Get institution information
  async getInstitution(institutionId) {
    try {
      const response = await this.client.institutionsGetById({
        institution_id: institutionId,
        country_codes: (process.env.PLAID_COUNTRY_CODES || 'US').split(','),
      });

      return response.data.institution;
    } catch (error) {
      console.error('Error fetching institution:', error);
      throw new Error('Failed to fetch institution information');
    }
  }

  // Get transactions for an account
  async getTransactions(accessToken, startDate, endDate, accountIds = null) {
    try {
      const request = {
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        count: 100,
        offset: 0,
      };

      if (accountIds) {
        request.account_ids = accountIds;
      }

      const response = await this.client.transactionsGet(request);
      return response.data.transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  // Create a bank transfer (ACH)
  async createBankTransfer(accessToken, accountId, type, amount, description) {
    try {
      // Note: This is a simplified example. In production, you'd need proper
      // bank transfer setup with Plaid's transfer product
      const response = await this.client.transferCreate({
        access_token: accessToken,
        account_id: accountId,
        type: type, // 'debit' or 'credit'
        network: 'ach',
        amount: amount.toString(),
        ach_class: 'web',
        user: {
          legal_name: 'SwearJar User',
        },
        description: description,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating bank transfer:', error);
      throw new Error('Failed to create bank transfer');
    }
  }

  // Verify account for micro-deposits
  async verifyMicroDeposits(accessToken, accountId, amounts) {
    try {
      const response = await this.client.processorMicroDepositsVerify({
        processor_token: accessToken, // This would be processor token in real implementation
        micro_deposits: amounts,
      });

      return response.data;
    } catch (error) {
      console.error('Error verifying micro deposits:', error);
      throw new Error('Failed to verify micro deposits');
    }
  }

  // Remove item (disconnect bank)
  async removeItem(accessToken) {
    try {
      const response = await this.client.itemRemove({
        access_token: accessToken,
      });

      return response.data;
    } catch (error) {
      console.error('Error removing item:', error);
      throw new Error('Failed to disconnect bank account');
    }
  }

  // Handle webhook events
  async handleWebhook(webhookType, webhookCode, itemId, error = null) {
    try {
      console.log(`Webhook received: ${webhookType}.${webhookCode} for item ${itemId}`);

      switch (webhookType) {
        case 'TRANSACTIONS':
          await this.handleTransactionWebhook(webhookCode, itemId);
          break;
        case 'ITEM':
          await this.handleItemWebhook(webhookCode, itemId, error);
          break;
        case 'AUTH':
          await this.handleAuthWebhook(webhookCode, itemId);
          break;
        default:
          console.log(`Unhandled webhook type: ${webhookType}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
    }
  }

  async handleTransactionWebhook(webhookCode, itemId) {
    // Handle transaction updates
    // You would typically sync new transactions here
  }

  async handleItemWebhook(webhookCode, itemId, error) {
    // Handle item-level events like errors or updates required
    if (webhookCode === 'ERROR') {
      console.error(`Item error for ${itemId}:`, error);
    }
  }

  async handleAuthWebhook(webhookCode, itemId) {
    // Handle authentication events
  }
}

module.exports = new PlaidService(); 