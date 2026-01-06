import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export class Lighter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lighter',
		name: 'lighter',
		icon: 'file:lighter.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Lighter (zkLighter) DEX API - High-performance perpetuals trading',
		defaults: {
			name: 'Lighter',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'lighterApi',
				required: true,
			},
		],
		properties: [
			// Resource selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Market',
						value: 'market',
					},
					{
						name: 'Order',
						value: 'order',
					},
					{
						name: 'Trade',
						value: 'trade',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
					{
						name: 'System',
						value: 'system',
					},
				],
				default: 'account',
			},

			// ==================== ACCOUNT OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{
						name: 'Get Account',
						value: 'getAccount',
						description: 'Get account by index or L1 address',
						action: 'Get account',
					},
					{
						name: 'Get Accounts by L1 Address',
						value: 'getAccountsByL1Address',
						description: 'Get all accounts associated with an L1 address',
						action: 'Get accounts by L1 address',
					},
					{
						name: 'Get Account Limits',
						value: 'getAccountLimits',
						description: 'Get account trading limits',
						action: 'Get account limits',
					},
					{
						name: 'Get Account Metadata',
						value: 'getAccountMetadata',
						description: 'Get account metadata',
						action: 'Get account metadata',
					},
					{
						name: 'Get PnL',
						value: 'getPnl',
						description: 'Get profit and loss data',
						action: 'Get PnL',
					},
					{
						name: 'Get Liquidations',
						value: 'getLiquidations',
						description: 'Get liquidation history',
						action: 'Get liquidations',
					},
					{
						name: 'Get Position Funding',
						value: 'getPositionFunding',
						description: 'Get position funding data',
						action: 'Get position funding',
					},
					{
						name: 'Get API Keys',
						value: 'getApiKeys',
						description: 'Get API keys information',
						action: 'Get API keys',
					},
					{
						name: 'Get Next Nonce',
						value: 'getNextNonce',
						description: 'Get next nonce for transaction signing',
						action: 'Get next nonce',
					},
				],
				default: 'getAccount',
			},

			// Account Parameters
			{
				displayName: 'Query By',
				name: 'queryBy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getAccount'],
					},
				},
				options: [
					{
						name: 'Account Index',
						value: 'index',
					},
					{
						name: 'L1 Address',
						value: 'l1_address',
					},
				],
				default: 'index',
			},
			{
				displayName: 'Account Index',
				name: 'accountIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getAccount', 'getAccountLimits', 'getAccountMetadata', 'getPnl', 'getLiquidations', 'getPositionFunding', 'getApiKeys', 'getNextNonce'],
					},
				},
				default: 0,
				description: 'The account index',
			},
			{
				displayName: 'L1 Address',
				name: 'l1Address',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getAccount', 'getAccountsByL1Address'],
					},
				},
				default: '',
				description: 'Ethereum L1 address',
			},
			{
				displayName: 'API Key Index',
				name: 'apiKeyIndexParam',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getNextNonce', 'getApiKeys'],
					},
				},
				default: 3,
				description: 'The API key index (3-254)',
			},

			// ==================== MARKET OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['market'],
					},
				},
				options: [
					{
						name: 'Get Order Books',
						value: 'getOrderBooks',
						description: 'Get all order books metadata',
						action: 'Get order books',
					},
					{
						name: 'Get Order Book Details',
						value: 'getOrderBookDetails',
						description: 'Get detailed order book for a market',
						action: 'Get order book details',
					},
					{
						name: 'Get Order Book Orders',
						value: 'getOrderBookOrders',
						description: 'Get order book orders',
						action: 'Get order book orders',
					},
					{
						name: 'Get Exchange Stats',
						value: 'getExchangeStats',
						description: 'Get exchange statistics',
						action: 'Get exchange stats',
					},
					{
						name: 'Get Funding Rates',
						value: 'getFundingRates',
						description: 'Get current funding rates',
						action: 'Get funding rates',
					},
					{
						name: 'Get Fundings',
						value: 'getFundings',
						description: 'Get funding rates history',
						action: 'Get fundings',
					},
				],
				default: 'getOrderBooks',
			},

			// Market Parameters
			{
				displayName: 'Market Index',
				name: 'marketIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['market'],
						operation: ['getOrderBookDetails', 'getOrderBookOrders', 'getFundings'],
					},
				},
				default: 0,
				description: 'The market index (0 = ETH-USD, etc.)',
			},
			{
				displayName: 'Depth',
				name: 'depth',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['market'],
						operation: ['getOrderBookDetails', 'getOrderBookOrders'],
					},
				},
				default: 20,
				description: 'Order book depth',
			},

			// ==================== ORDER OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['order'],
					},
				},
				options: [
					{
						name: 'Get Active Orders',
						value: 'getActiveOrders',
						description: 'Get account active orders',
						action: 'Get active orders',
					},
					{
						name: 'Get Inactive Orders',
						value: 'getInactiveOrders',
						description: 'Get account inactive orders',
						action: 'Get inactive orders',
					},
					{
						name: 'Export Orders',
						value: 'exportOrders',
						description: 'Export order data',
						action: 'Export orders',
					},
				],
				default: 'getActiveOrders',
			},

			// Order Parameters
			{
				displayName: 'Account Index',
				name: 'orderAccountIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['order'],
					},
				},
				default: 0,
				description: 'The account index',
			},
			{
				displayName: 'Market Index',
				name: 'orderMarketIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['order'],
						operation: ['getActiveOrders', 'getInactiveOrders'],
					},
				},
				default: -1,
				description: 'Filter by market index (-1 for all markets)',
			},

			// ==================== TRADE OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['trade'],
					},
				},
				options: [
					{
						name: 'Get Recent Trades',
						value: 'getRecentTrades',
						description: 'Get recent trades for a market',
						action: 'Get recent trades',
					},
					{
						name: 'Get Trades',
						value: 'getTrades',
						description: 'Get trades with filters',
						action: 'Get trades',
					},
				],
				default: 'getRecentTrades',
			},

			// Trade Parameters
			{
				displayName: 'Market Index',
				name: 'tradeMarketIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trade'],
					},
				},
				default: 0,
				description: 'The market index',
			},
			{
				displayName: 'Limit',
				name: 'tradeLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trade'],
					},
				},
				default: 100,
				description: 'Maximum number of trades to return',
			},
			{
				displayName: 'Account Index',
				name: 'tradeAccountIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trade'],
						operation: ['getTrades'],
					},
				},
				default: -1,
				description: 'Filter by account index (-1 for all accounts)',
			},

			// ==================== TRANSACTION OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
					},
				},
				options: [
					{
						name: 'Get Transaction',
						value: 'getTransaction',
						description: 'Get transaction by hash',
						action: 'Get transaction',
					},
					{
						name: 'Get Transactions',
						value: 'getTransactions',
						description: 'Get multiple transactions',
						action: 'Get transactions',
					},
					{
						name: 'Get Deposit History',
						value: 'getDepositHistory',
						description: 'Get deposit history',
						action: 'Get deposit history',
					},
					{
						name: 'Get Withdraw History',
						value: 'getWithdrawHistory',
						description: 'Get withdrawal history',
						action: 'Get withdraw history',
					},
					{
						name: 'Get Transfer History',
						value: 'getTransferHistory',
						description: 'Get transfer history',
						action: 'Get transfer history',
					},
					{
						name: 'Get Transfer Fee Info',
						value: 'getTransferFeeInfo',
						description: 'Get transfer fee information',
						action: 'Get transfer fee info',
					},
					{
						name: 'Get Withdrawal Delay',
						value: 'getWithdrawalDelay',
						description: 'Get withdrawal delay information',
						action: 'Get withdrawal delay',
					},
				],
				default: 'getTransaction',
			},

			// Transaction Parameters
			{
				displayName: 'Transaction Hash',
				name: 'txHash',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['getTransaction'],
					},
				},
				default: '',
				description: 'The transaction hash',
			},
			{
				displayName: 'Account Index',
				name: 'txAccountIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['getTransactions', 'getDepositHistory', 'getWithdrawHistory', 'getTransferHistory'],
					},
				},
				default: 0,
				description: 'The account index',
			},
			{
				displayName: 'Limit',
				name: 'txLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['getTransactions', 'getDepositHistory', 'getWithdrawHistory', 'getTransferHistory'],
					},
				},
				default: 50,
				description: 'Maximum number of transactions to return',
			},

			// ==================== SYSTEM OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['system'],
					},
				},
				options: [
					{
						name: 'Get Status',
						value: 'getStatus',
						description: 'Get system status',
						action: 'Get status',
					},
					{
						name: 'Get Info',
						value: 'getInfo',
						description: 'Get exchange information',
						action: 'Get info',
					},
					{
						name: 'Get Announcements',
						value: 'getAnnouncements',
						description: 'Get system announcements',
						action: 'Get announcements',
					},
					{
						name: 'Get Public Pools Metadata',
						value: 'getPublicPoolsMetadata',
						description: 'Get public pools metadata',
						action: 'Get public pools metadata',
					},
					{
						name: 'Get Fast Bridge Info',
						value: 'getFastBridgeInfo',
						description: 'Get fast bridge information',
						action: 'Get fast bridge info',
					},
				],
				default: 'getStatus',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('lighterApi');

		const baseUrl = credentials.environment === 'mainnet'
			? 'https://mainnet.zklighter.elliot.ai'
			: 'https://testnet.zklighter.elliot.ai';

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let endpoint = '';
				let method: IHttpRequestMethods = 'GET';
				const qs: IDataObject = {};

				// ==================== ACCOUNT ====================
				if (resource === 'account') {
					if (operation === 'getAccount') {
						const queryBy = this.getNodeParameter('queryBy', i) as string;
						endpoint = '/api/v1/account';
						qs.by = queryBy;
						if (queryBy === 'index') {
							qs.value = this.getNodeParameter('accountIndex', i) as number;
						} else {
							qs.value = this.getNodeParameter('l1Address', i) as string;
						}
					} else if (operation === 'getAccountsByL1Address') {
						endpoint = '/api/v1/accountsByL1Address';
						qs.l1_address = this.getNodeParameter('l1Address', i) as string;
					} else if (operation === 'getAccountLimits') {
						endpoint = '/api/v1/accountLimits';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
					} else if (operation === 'getAccountMetadata') {
						endpoint = '/api/v1/accountMetadata';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
					} else if (operation === 'getPnl') {
						endpoint = '/api/v1/pnl';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
					} else if (operation === 'getLiquidations') {
						endpoint = '/api/v1/liquidations';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
					} else if (operation === 'getPositionFunding') {
						endpoint = '/api/v1/positionFunding';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
					} else if (operation === 'getApiKeys') {
						endpoint = '/api/v1/apikeys';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
						qs.api_key_index = this.getNodeParameter('apiKeyIndexParam', i) as number;
					} else if (operation === 'getNextNonce') {
						endpoint = '/api/v1/nextNonce';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
						qs.api_key_index = this.getNodeParameter('apiKeyIndexParam', i) as number;
					}
				}

				// ==================== MARKET ====================
				else if (resource === 'market') {
					if (operation === 'getOrderBooks') {
						endpoint = '/api/v1/orderBooks';
					} else if (operation === 'getOrderBookDetails') {
						endpoint = '/api/v1/orderBookDetails';
						qs.market_index = this.getNodeParameter('marketIndex', i) as number;
						qs.depth = this.getNodeParameter('depth', i) as number;
					} else if (operation === 'getOrderBookOrders') {
						endpoint = '/api/v1/orderBookOrders';
						qs.market_index = this.getNodeParameter('marketIndex', i) as number;
						qs.depth = this.getNodeParameter('depth', i) as number;
					} else if (operation === 'getExchangeStats') {
						endpoint = '/api/v1/exchangeStats';
					} else if (operation === 'getFundingRates') {
						endpoint = '/api/v1/funding-rates';
					} else if (operation === 'getFundings') {
						endpoint = '/api/v1/fundings';
						qs.market_index = this.getNodeParameter('marketIndex', i) as number;
					}
				}

				// ==================== ORDER ====================
				else if (resource === 'order') {
					const accountIndex = this.getNodeParameter('orderAccountIndex', i) as number;
					qs.account_index = accountIndex;

					if (operation === 'getActiveOrders') {
						endpoint = '/api/v1/accountActiveOrders';
						const marketIndex = this.getNodeParameter('orderMarketIndex', i) as number;
						if (marketIndex >= 0) {
							qs.market_index = marketIndex;
						}
					} else if (operation === 'getInactiveOrders') {
						endpoint = '/api/v1/accountInactiveOrders';
						const marketIndex = this.getNodeParameter('orderMarketIndex', i) as number;
						if (marketIndex >= 0) {
							qs.market_index = marketIndex;
						}
					} else if (operation === 'exportOrders') {
						endpoint = '/api/v1/export';
					}
				}

				// ==================== TRADE ====================
				else if (resource === 'trade') {
					const marketIndex = this.getNodeParameter('tradeMarketIndex', i) as number;
					const limit = this.getNodeParameter('tradeLimit', i) as number;

					if (operation === 'getRecentTrades') {
						endpoint = '/api/v1/recentTrades';
						qs.market_index = marketIndex;
						qs.limit = limit;
					} else if (operation === 'getTrades') {
						endpoint = '/api/v1/trades';
						qs.market_index = marketIndex;
						qs.limit = limit;
						const accountIndex = this.getNodeParameter('tradeAccountIndex', i) as number;
						if (accountIndex >= 0) {
							qs.account_index = accountIndex;
						}
					}
				}

				// ==================== TRANSACTION ====================
				else if (resource === 'transaction') {
					if (operation === 'getTransaction') {
						endpoint = '/api/v1/tx';
						qs.hash = this.getNodeParameter('txHash', i) as string;
					} else if (operation === 'getTransactions') {
						endpoint = '/api/v1/txs';
						qs.account_index = this.getNodeParameter('txAccountIndex', i) as number;
						qs.limit = this.getNodeParameter('txLimit', i) as number;
					} else if (operation === 'getDepositHistory') {
						endpoint = '/api/v1/deposit_history';
						qs.account_index = this.getNodeParameter('txAccountIndex', i) as number;
						qs.limit = this.getNodeParameter('txLimit', i) as number;
					} else if (operation === 'getWithdrawHistory') {
						endpoint = '/api/v1/withdraw_history';
						qs.account_index = this.getNodeParameter('txAccountIndex', i) as number;
						qs.limit = this.getNodeParameter('txLimit', i) as number;
					} else if (operation === 'getTransferHistory') {
						endpoint = '/api/v1/transfer_history';
						qs.account_index = this.getNodeParameter('txAccountIndex', i) as number;
						qs.limit = this.getNodeParameter('txLimit', i) as number;
					} else if (operation === 'getTransferFeeInfo') {
						endpoint = '/api/v1/transferFeeInfo';
					} else if (operation === 'getWithdrawalDelay') {
						endpoint = '/api/v1/withdrawalDelay';
					}
				}

				// ==================== SYSTEM ====================
				else if (resource === 'system') {
					if (operation === 'getStatus') {
						endpoint = '/api/v1/status';
					} else if (operation === 'getInfo') {
						endpoint = '/info';
					} else if (operation === 'getAnnouncements') {
						endpoint = '/api/v1/announcement';
					} else if (operation === 'getPublicPoolsMetadata') {
						endpoint = '/api/v1/publicPoolsMetadata';
					} else if (operation === 'getFastBridgeInfo') {
						endpoint = '/api/v1/fastbridge_info';
					}
				}

				// Make the request
				const requestOptions: IDataObject = {
					method,
					url: `${baseUrl}${endpoint}`,
					qs,
					json: true,
				};

				// Add auth header if token is available
				if (credentials.authToken) {
					requestOptions.headers = {
						Authorization: credentials.authToken as string,
					};
				}

				const response = await this.helpers.request(requestOptions);
				
				returnData.push({
					json: response as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				const errorMessage = (error as Error).message;
				throw new NodeApiError(this.getNode(), { message: errorMessage }, { message: errorMessage });
			}
		}

		return [returnData];
	}
}
