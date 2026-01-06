import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IDataObject,
} from 'n8n-workflow';
import WebSocket from 'ws';

export class LighterTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lighter Trigger',
		name: 'lighterTrigger',
		icon: 'file:lighter.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["channel"]}}',
		description: 'Subscribe to Lighter WebSocket channels for real-time data',
		defaults: {
			name: 'Lighter Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'lighterApi',
				required: true,
			},
		],
		properties: [
			// Channel selection
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Order Book',
						value: 'order_book',
						description: 'Real-time orderbook updates (every 50ms)',
					},
					{
						name: 'Market Stats',
						value: 'market_stats',
						description: 'Market statistics updates',
					},
					{
						name: 'Trade',
						value: 'trade',
						description: 'Trade feed for a market',
					},
					{
						name: 'Spot Market Stats',
						value: 'spot_market_stats',
						description: 'Spot market statistics',
					},
					{
						name: 'Account All',
						value: 'account_all',
						description: 'All account data (positions, orders, trades)',
					},
					{
						name: 'Account Orders',
						value: 'account_all_orders',
						description: 'All account orders',
					},
					{
						name: 'Account Trades',
						value: 'account_all_trades',
						description: 'All account trades',
					},
					{
						name: 'Account Positions',
						value: 'account_all_positions',
						description: 'All account positions',
					},
					{
						name: 'Account Assets',
						value: 'account_all_assets',
						description: 'All account assets (spot)',
					},
					{
						name: 'User Stats',
						value: 'user_stats',
						description: 'Account statistics',
					},
					{
						name: 'Account Transactions',
						value: 'account_tx',
						description: 'Account transaction updates',
					},
					{
						name: 'Notifications',
						value: 'notification',
						description: 'Account notifications (liquidation, deleverage)',
					},
					{
						name: 'Height',
						value: 'height',
						description: 'Blockchain height updates',
					},
				],
				default: 'order_book',
			},

			// Market Index (for market-specific channels)
			{
				displayName: 'Market Index',
				name: 'marketIndex',
				type: 'number',
				displayOptions: {
					show: {
						channel: ['order_book', 'market_stats', 'trade', 'spot_market_stats'],
					},
				},
				default: 0,
				description: 'The market index (0 = ETH-USD, etc.). Use "all" equivalent (-1) for market_stats/spot_market_stats.',
			},
			{
				displayName: 'Subscribe to All Markets',
				name: 'allMarkets',
				type: 'boolean',
				displayOptions: {
					show: {
						channel: ['market_stats', 'spot_market_stats'],
					},
				},
				default: false,
				description: 'Whether to subscribe to all markets instead of a specific one',
			},

			// Account Index (for account-specific channels)
			{
				displayName: 'Account Index',
				name: 'accountIndex',
				type: 'number',
				displayOptions: {
					show: {
						channel: [
							'account_all',
							'account_all_orders',
							'account_all_trades',
							'account_all_positions',
							'account_all_assets',
							'user_stats',
							'account_tx',
							'notification',
						],
					},
				},
				default: 0,
				description: 'The account index to subscribe to',
			},

			// Options
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Reconnect on Disconnect',
						name: 'reconnect',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically reconnect if disconnected',
					},
					{
						displayName: 'Reconnect Interval (ms)',
						name: 'reconnectInterval',
						type: 'number',
						default: 5000,
						description: 'Time to wait before reconnecting',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('lighterApi');
		const channel = this.getNodeParameter('channel') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const wsUrl = credentials.environment === 'mainnet'
			? 'wss://mainnet.zklighter.elliot.ai/stream'
			: 'wss://testnet.zklighter.elliot.ai/stream';

		let ws: WebSocket | null = null;
		let reconnectTimeout: NodeJS.Timeout | null = null;
		let isClosing = false;

		const buildChannelString = (): string => {
			switch (channel) {
				case 'order_book':
				case 'trade': {
					const marketIndex = this.getNodeParameter('marketIndex') as number;
					return `${channel}/${marketIndex}`;
				}
				case 'market_stats':
				case 'spot_market_stats': {
					const allMarkets = this.getNodeParameter('allMarkets') as boolean;
					if (allMarkets) {
						return `${channel}/all`;
					}
					const marketIndex = this.getNodeParameter('marketIndex') as number;
					return `${channel}/${marketIndex}`;
				}
				case 'account_all':
				case 'account_all_orders':
				case 'account_all_trades':
				case 'account_all_positions':
				case 'account_all_assets':
				case 'user_stats':
				case 'account_tx':
				case 'notification': {
					const accountIndex = this.getNodeParameter('accountIndex') as number;
					return `${channel}/${accountIndex}`;
				}
				case 'height':
					return 'height';
				default:
					return channel;
			}
		};

		const requiresAuth = [
			'account_all',
			'account_all_orders',
			'account_all_trades',
			'account_all_positions',
			'account_all_assets',
			'user_stats',
			'account_tx',
			'notification',
		].includes(channel);

		const connect = () => {
			ws = new WebSocket(wsUrl);

			ws.on('open', () => {
				const channelString = buildChannelString();
				const subscribeMsg: IDataObject = {
					type: 'subscribe',
					channel: channelString,
				};

				// Add auth token for authenticated channels
				if (requiresAuth && credentials.authToken) {
					subscribeMsg.auth = credentials.authToken as string;
				}

				ws?.send(JSON.stringify(subscribeMsg));
				this.logger.info(`Subscribed to Lighter channel: ${channelString}`);
			});

			ws.on('message', (data: WebSocket.Data) => {
				try {
					const message = JSON.parse(data.toString());
					
					// Emit the data to the workflow
					this.emit([this.helpers.returnJsonArray([message])]);
				} catch (error) {
					this.logger.error('Failed to parse WebSocket message', { error });
				}
			});

			ws.on('error', (error: Error) => {
				this.logger.error('WebSocket error', { error: error.message });
			});

			ws.on('close', () => {
				if (!isClosing && options.reconnect !== false) {
					const interval = (options.reconnectInterval as number) || 5000;
					this.logger.info(`WebSocket closed, reconnecting in ${interval}ms`);
					reconnectTimeout = setTimeout(() => {
						connect();
					}, interval);
				}
			});
		};

		connect();

		// Return the close function
		const closeFunction = async () => {
			isClosing = true;
			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout);
			}
			if (ws) {
				ws.close();
			}
		};

		return {
			closeFunction,
		};
	}
}
