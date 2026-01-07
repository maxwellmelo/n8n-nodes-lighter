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
		description:
			'Interact with Lighter (zkLighter) DEX API - High-performance perpetuals trading',
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
						name: 'Position',
						value: 'position',
					},
					{
						name: 'Trade',
						value: 'trade',
					},
					{
						name: 'Trading',
						value: 'trading',
						description: 'Execute trades via Trading Backend (requires backend URL)',
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
						description:
							'Get profit and loss chart data (requires auth token for main accounts)',
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
						description:
							'Get position funding history (requires auth token for main accounts)',
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
						operation: [
							'getAccount',
							'getAccountLimits',
							'getAccountMetadata',
							'getPnl',
							'getLiquidations',
							'getPositionFunding',
							'getApiKeys',
							'getNextNonce',
						],
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
			{
				displayName: 'Resolution',
				name: 'pnlResolution',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getPnl'],
					},
				},
				options: [
					{ name: '1 Hour', value: '1h' },
					{ name: '1 Day', value: '1d' },
				],
				default: '1h',
				description: 'Time resolution for PnL data',
			},
			{
				displayName: 'Count Back',
				name: 'pnlCountBack',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getPnl'],
					},
				},
				default: 24,
				description: 'Number of periods to return',
			},
			{
				displayName: 'Start Time',
				name: 'pnlStartTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getPnl'],
					},
				},
				default: '',
				description: 'Start time for PnL data (leave empty for 24h ago)',
			},
			{
				displayName: 'End Time',
				name: 'pnlEndTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getPnl'],
					},
				},
				default: '',
				description: 'End time for PnL data (leave empty for now)',
			},
			{
				displayName: 'Limit',
				name: 'positionFundingLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getPositionFunding'],
					},
				},
				default: 50,
				description: 'Maximum number of position funding records to return',
			},
			{
				displayName: 'Market Index',
				name: 'positionFundingMarketIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getPositionFunding'],
					},
				},
				default: -1,
				description: 'Filter by market index (-1 for all markets)',
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
				displayName: 'Resolution',
				name: 'fundingResolution',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['market'],
						operation: ['getFundings'],
					},
				},
				options: [
					{ name: '1 Hour', value: '1h' },
					{ name: '1 Day', value: '1d' },
				],
				default: '1h',
				description: 'Time resolution for funding data',
			},
			{
				displayName: 'Count Back',
				name: 'fundingCountBack',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['market'],
						operation: ['getFundings'],
					},
				},
				default: 24,
				description: 'Number of periods to return (from now backwards)',
			},
			{
				displayName: 'Start Time',
				name: 'fundingStartTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['market'],
						operation: ['getFundings'],
					},
				},
				default: '',
				description: 'Start time for funding data (leave empty for 24h ago)',
			},
			{
				displayName: 'End Time',
				name: 'fundingEndTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['market'],
						operation: ['getFundings'],
					},
				},
				default: '',
				description: 'End time for funding data (leave empty for now)',
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
						description: 'Get account active orders (requires auth token)',
						action: 'Get active orders',
					},
					{
						name: 'Get Inactive Orders',
						value: 'getInactiveOrders',
						description: 'Get account inactive orders (requires auth token)',
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

			// ==================== TRADING OPERATIONS (via Backend) ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['trading'],
					},
				},
				options: [
					{
						name: 'Create Limit Order',
						value: 'createLimitOrder',
						description: 'Create a limit order',
						action: 'Create limit order',
					},
					{
						name: 'Create Market Order',
						value: 'createMarketOrder',
						description: 'Create a market order',
						action: 'Create market order',
					},
					{
						name: 'Cancel Order',
						value: 'cancelOrder',
						description: 'Cancel a specific order',
						action: 'Cancel order',
					},
					{
						name: 'Cancel All Orders',
						value: 'cancelAllOrders',
						description: 'Cancel all open orders',
						action: 'Cancel all orders',
					},
					{
						name: 'Close Position',
						value: 'closePosition',
						description: 'Close an open position with market order',
						action: 'Close position',
					},
					{
						name: 'Update Leverage',
						value: 'updateLeverage',
						description: 'Update leverage for a market',
						action: 'Update leverage',
					},
				],
				default: 'createLimitOrder',
			},

			// Trading Parameters - Market Index
			{
				displayName: 'Market Index',
				name: 'tradingMarketIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trading'],
					},
				},
				default: 0,
				description: 'Market index (0=ETH, 1=BTC, 2=SOL, etc.)',
			},

			// Trading Parameters - Side
			{
				displayName: 'Side',
				name: 'tradingSide',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['createLimitOrder', 'createMarketOrder'],
					},
				},
				options: [
					{ name: 'Buy / Long', value: 'buy' },
					{ name: 'Sell / Short', value: 'sell' },
				],
				default: 'buy',
			},

			// Trading Parameters - Size
			{
				displayName: 'Size',
				name: 'tradingSize',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['createLimitOrder', 'createMarketOrder'],
					},
				},
				default: 0.01,
				typeOptions: { minValue: 0, numberPrecision: 4 },
				description: 'Order size in base asset',
			},

			// Trading Parameters - Price
			{
				displayName: 'Price',
				name: 'tradingPrice',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['createLimitOrder'],
					},
				},
				default: 0,
				typeOptions: { numberPrecision: 2 },
				description: 'Limit price for the order',
			},

			// Trading Parameters - Slippage
			{
				displayName: 'Slippage %',
				name: 'tradingSlippage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['createMarketOrder', 'closePosition'],
					},
				},
				default: 0.5,
				typeOptions: { minValue: 0.1, maxValue: 10 },
				description: 'Maximum slippage tolerance percentage',
			},

			// Trading Parameters - Reduce Only
			{
				displayName: 'Reduce Only',
				name: 'tradingReduceOnly',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['createLimitOrder', 'createMarketOrder'],
					},
				},
				default: false,
				description: 'Whether order can only reduce an existing position',
			},

			// Trading Parameters - Post Only
			{
				displayName: 'Post Only',
				name: 'tradingPostOnly',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['createLimitOrder'],
					},
				},
				default: false,
				description: 'Whether order should be maker only',
			},

			// Trading Parameters - Order Index
			{
				displayName: 'Order Index',
				name: 'tradingOrderIndex',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['cancelOrder'],
					},
				},
				default: 0,
				description: 'The order index to cancel',
			},

			// Trading Parameters - Leverage
			{
				displayName: 'Leverage',
				name: 'tradingLeverage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['updateLeverage'],
					},
				},
				default: 10,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Leverage multiplier (1-100x)',
			},

			// Trading Parameters - Margin Mode
			{
				displayName: 'Margin Mode',
				name: 'tradingMarginMode',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['trading'],
						operation: ['updateLeverage'],
					},
				},
				options: [
					{ name: 'Cross', value: 'cross' },
					{ name: 'Isolated', value: 'isolated' },
				],
				default: 'cross',
			},

			// ==================== POSITION OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['position'],
					},
				},
				options: [
					{
						name: 'Get Positions',
						value: 'getPositions',
						description: 'Get open positions from backend',
						action: 'Get positions',
					},
					{
						name: 'Get Orders',
						value: 'getOrders',
						description: 'Get active orders from backend',
						action: 'Get orders',
					},
				],
				default: 'getPositions',
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
						description: 'Get trades with filters (requires auth token)',
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
			{
				displayName: 'Sort By',
				name: 'tradeSortBy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['trade'],
						operation: ['getTrades'],
					},
				},
				options: [
					{ name: 'Timestamp', value: 'timestamp' },
					{ name: 'Price', value: 'price' },
					{ name: 'Size', value: 'size' },
				],
				default: 'timestamp',
				description: 'Field to sort by',
			},
			{
				displayName: 'Sort Direction',
				name: 'tradeSortDir',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['trade'],
						operation: ['getTrades'],
					},
				},
				options: [
					{ name: 'Descending', value: 'desc' },
					{ name: 'Ascending', value: 'asc' },
				],
				default: 'desc',
				description: 'Sort direction',
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
						description: 'Get deposit history (requires auth token)',
						action: 'Get deposit history',
					},
					{
						name: 'Get Withdraw History',
						value: 'getWithdrawHistory',
						description: 'Get withdrawal history (requires auth token)',
						action: 'Get withdraw history',
					},
					{
						name: 'Get Transfer History',
						value: 'getTransferHistory',
						description: 'Get transfer history (requires auth token)',
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
						operation: [
							'getTransactions',
							'getDepositHistory',
							'getWithdrawHistory',
							'getTransferHistory',
						],
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
						operation: [
							'getTransactions',
							'getDepositHistory',
							'getWithdrawHistory',
							'getTransferHistory',
						],
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
					{
						name: 'Get Auth Token',
						value: 'getAuthToken',
						description:
							'Get auth token from Trading Backend for authenticated API calls',
						action: 'Get auth token',
					},
				],
				default: 'getStatus',
			},
			{
				displayName: 'Token Expiry (seconds)',
				name: 'authTokenExpiry',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['system'],
						operation: ['getAuthToken'],
					},
				},
				default: 3600,
				description:
					'How long the auth token should be valid (max 8 hours = 28800 seconds)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('lighterApi');

		const baseUrl =
			credentials.environment === 'mainnet'
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
						const accountIndex = this.getNodeParameter('accountIndex', i) as number;
						qs.by = 'index';
						qs.value = String(accountIndex);
						qs.resolution = this.getNodeParameter('pnlResolution', i) as string;
						qs.count_back = this.getNodeParameter('pnlCountBack', i) as number;

						const startTime = this.getNodeParameter('pnlStartTime', i) as string;
						const endTime = this.getNodeParameter('pnlEndTime', i) as string;

						if (endTime) {
							qs.end_timestamp = new Date(endTime).getTime();
						} else {
							qs.end_timestamp = Date.now();
						}

						if (startTime) {
							qs.start_timestamp = new Date(startTime).getTime();
						} else {
							qs.start_timestamp = (qs.end_timestamp as number) - 86400000;
						}
					} else if (operation === 'getLiquidations') {
						endpoint = '/api/v1/liquidations';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
					} else if (operation === 'getPositionFunding') {
						endpoint = '/api/v1/positionFunding';
						qs.account_index = this.getNodeParameter('accountIndex', i) as number;
						qs.limit = this.getNodeParameter('positionFundingLimit', i) as number;
						const marketIndex = this.getNodeParameter(
							'positionFundingMarketIndex',
							i,
						) as number;
						if (marketIndex >= 0) {
							qs.market_id = marketIndex;
						}
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
						qs.market_id = this.getNodeParameter('marketIndex', i) as number;
						qs.depth = this.getNodeParameter('depth', i) as number;
					} else if (operation === 'getOrderBookOrders') {
						endpoint = '/api/v1/orderBookOrders';
						qs.market_id = this.getNodeParameter('marketIndex', i) as number;
						qs.limit = this.getNodeParameter('depth', i) as number;
					} else if (operation === 'getExchangeStats') {
						endpoint = '/api/v1/exchangeStats';
					} else if (operation === 'getFundingRates') {
						endpoint = '/api/v1/funding-rates';
					} else if (operation === 'getFundings') {
						endpoint = '/api/v1/fundings';
						qs.market_id = this.getNodeParameter('marketIndex', i) as number;
						qs.resolution = this.getNodeParameter('fundingResolution', i) as string;
						qs.count_back = this.getNodeParameter('fundingCountBack', i) as number;

						// Handle timestamps - API requires start_timestamp and end_timestamp in milliseconds
						const startTime = this.getNodeParameter('fundingStartTime', i) as string;
						const endTime = this.getNodeParameter('fundingEndTime', i) as string;

						if (endTime) {
							qs.end_timestamp = new Date(endTime).getTime();
						} else {
							qs.end_timestamp = Date.now();
						}

						if (startTime) {
							qs.start_timestamp = new Date(startTime).getTime();
						} else {
							// Default to 24 hours before end_timestamp
							qs.start_timestamp = (qs.end_timestamp as number) - 86400000;
						}
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
							qs.market_id = marketIndex;
						}
					} else if (operation === 'getInactiveOrders') {
						endpoint = '/api/v1/accountInactiveOrders';
						const marketIndex = this.getNodeParameter('orderMarketIndex', i) as number;
						if (marketIndex >= 0) {
							qs.market_id = marketIndex;
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
						qs.market_id = marketIndex;
						qs.limit = limit;
					} else if (operation === 'getTrades') {
						endpoint = '/api/v1/trades';
						qs.market_id = marketIndex;
						qs.limit = limit;
						qs.sort_by = this.getNodeParameter('tradeSortBy', i) as string;
						qs.sort_dir = this.getNodeParameter('tradeSortDir', i) as string;
						const accountIndex = this.getNodeParameter(
							'tradeAccountIndex',
							i,
						) as number;
						if (accountIndex >= 0) {
							qs.account_index = accountIndex;
						}
					}
				}

				// ==================== TRANSACTION ====================
				else if (resource === 'transaction') {
					if (operation === 'getTransaction') {
						endpoint = '/api/v1/tx';
						qs.by = 'hash';
						qs.value = this.getNodeParameter('txHash', i) as string;
					} else if (operation === 'getTransactions') {
						endpoint = '/api/v1/txs';
						qs.account_index = this.getNodeParameter('txAccountIndex', i) as number;
						qs.limit = this.getNodeParameter('txLimit', i) as number;
					} else if (operation === 'getDepositHistory') {
						endpoint = '/api/v1/deposit/history';
						qs.account_index = this.getNodeParameter('txAccountIndex', i) as number;
						qs.limit = this.getNodeParameter('txLimit', i) as number;
					} else if (operation === 'getWithdrawHistory') {
						endpoint = '/api/v1/withdraw/history';
						qs.account_index = this.getNodeParameter('txAccountIndex', i) as number;
						qs.limit = this.getNodeParameter('txLimit', i) as number;
					} else if (operation === 'getTransferHistory') {
						endpoint = '/api/v1/transfer/history';
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
					} else if (operation === 'getAuthToken') {
						const backendUrl = credentials.tradingBackendUrl as string;
						if (!backendUrl) {
							throw new NodeApiError(this.getNode(), {
								message:
									'Trading Backend URL is required for auth token generation. Configure it in credentials.',
							});
						}

						const backendHeaders: IDataObject = {
							'Content-Type': 'application/json',
						};
						if (credentials.backendApiSecret) {
							backendHeaders['X-API-Secret'] = credentials.backendApiSecret as string;
						}

						const expiry = this.getNodeParameter('authTokenExpiry', i) as number;

						const backendResponse = await this.helpers.request({
							method: 'GET',
							url: `${backendUrl}/api/auth-token?expiry=${expiry}`,
							headers: backendHeaders,
							json: true,
						});

						returnData.push({
							json: backendResponse as IDataObject,
							pairedItem: { item: i },
						});
						continue;
					}
				}

				// ==================== TRADING (via Backend) ====================
				else if (resource === 'trading') {
					const backendUrl = credentials.tradingBackendUrl as string;
					if (!backendUrl) {
						throw new NodeApiError(this.getNode(), {
							message:
								'Trading Backend URL is required for trading operations. Configure it in credentials.',
						});
					}

					const backendHeaders: IDataObject = {
						'Content-Type': 'application/json',
					};
					if (credentials.backendApiSecret) {
						backendHeaders['X-API-Secret'] = credentials.backendApiSecret as string;
					}

					let backendEndpoint = '';
					let backendBody: IDataObject = {};
					const marketIndex = this.getNodeParameter('tradingMarketIndex', i) as number;

					if (operation === 'createLimitOrder') {
						backendEndpoint = '/api/order/limit';
						backendBody = {
							market_index: marketIndex,
							side: this.getNodeParameter('tradingSide', i) as string,
							size: this.getNodeParameter('tradingSize', i) as number,
							price: this.getNodeParameter('tradingPrice', i) as number,
							reduce_only: this.getNodeParameter('tradingReduceOnly', i) as boolean,
							post_only: this.getNodeParameter('tradingPostOnly', i) as boolean,
						};
					} else if (operation === 'createMarketOrder') {
						backendEndpoint = '/api/order/market';
						backendBody = {
							market_index: marketIndex,
							side: this.getNodeParameter('tradingSide', i) as string,
							size: this.getNodeParameter('tradingSize', i) as number,
							slippage: this.getNodeParameter('tradingSlippage', i) as number,
							reduce_only: this.getNodeParameter('tradingReduceOnly', i) as boolean,
						};
					} else if (operation === 'cancelOrder') {
						backendEndpoint = '/api/order/cancel';
						backendBody = {
							market_index: marketIndex,
							order_index: this.getNodeParameter('tradingOrderIndex', i) as number,
						};
					} else if (operation === 'cancelAllOrders') {
						backendEndpoint = '/api/order/cancel-all';
						backendBody = {
							market_index: marketIndex >= 0 ? marketIndex : undefined,
						};
					} else if (operation === 'closePosition') {
						backendEndpoint = '/api/position/close';
						backendBody = {
							market_index: marketIndex,
							slippage: this.getNodeParameter('tradingSlippage', i) as number,
						};
					} else if (operation === 'updateLeverage') {
						backendEndpoint = '/api/position/update-leverage';
						backendBody = {
							market_index: marketIndex,
							leverage: this.getNodeParameter('tradingLeverage', i) as number,
							margin_mode: this.getNodeParameter('tradingMarginMode', i) as string,
						};
					}

					const backendResponse = await this.helpers.request({
						method: 'POST',
						url: `${backendUrl}${backendEndpoint}`,
						headers: backendHeaders,
						body: backendBody,
						json: true,
					});

					returnData.push({
						json: backendResponse as IDataObject,
						pairedItem: { item: i },
					});
					continue;
				}

				// ==================== POSITION (via Backend) ====================
				else if (resource === 'position') {
					const backendUrl = credentials.tradingBackendUrl as string;
					if (!backendUrl) {
						throw new NodeApiError(this.getNode(), {
							message:
								'Trading Backend URL is required for position operations. Configure it in credentials.',
						});
					}

					const backendHeaders: IDataObject = {
						'Content-Type': 'application/json',
					};
					if (credentials.backendApiSecret) {
						backendHeaders['X-API-Secret'] = credentials.backendApiSecret as string;
					}

					let backendEndpoint = '';

					if (operation === 'getPositions') {
						backendEndpoint = '/api/positions';
					} else if (operation === 'getOrders') {
						backendEndpoint = '/api/orders';
					}

					const backendResponse = await this.helpers.request({
						method: 'GET',
						url: `${backendUrl}${backendEndpoint}`,
						headers: backendHeaders,
						json: true,
					});

					returnData.push({
						json: backendResponse as IDataObject,
						pairedItem: { item: i },
					});
					continue;
				}

				// Make the request (for non-backend operations)
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
				throw new NodeApiError(
					this.getNode(),
					{ message: errorMessage },
					{ message: errorMessage },
				);
			}
		}

		return [returnData];
	}
}
