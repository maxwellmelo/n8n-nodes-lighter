import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	IDataObject,
} from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class LighterTradingTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lighter Trading Tool',
		name: 'lighterTradingTool',
		icon: 'file:lighter.svg',
		group: ['transform'],
		version: 1,
		description: 'Execute trades on Lighter DEX - create orders, cancel orders, close positions for AI agents',
		defaults: {
			name: 'Lighter Trading',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/maxwellmelo/n8n-nodes-lighter',
					},
				],
			},
		},
		inputs: [],
		outputs: ['ai_tool'],
		outputNames: ['Tool'],
		credentials: [
			{
				name: 'lighterApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Notice',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {},
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, _itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('lighterApi');
		const backendUrl = credentials.tradingBackendUrl as string;
		const backendSecret = credentials.backendApiSecret as string;

		if (!backendUrl) {
			throw new Error('Trading Backend URL is required for trading operations. Configure it in credentials.');
		}

		const tool = new DynamicStructuredTool({
			name: 'lighter_trading',
			description: `Execute trades on Lighter DEX. Use this tool to:
- Create LIMIT orders (specify price)
- Create MARKET orders (instant execution with slippage)
- Cancel specific orders
- Cancel all orders
- Close positions

IMPORTANT: This tool executes REAL trades. Always confirm with the user before executing.

Available markets: BTC-PERP (0), ETH-PERP (1), SOL-PERP (2), and more.
Sides: 'long' (buy) or 'short' (sell)

The Lighter DEX requires a trading backend for transaction signing.`,
			schema: z.object({
				action: z.enum([
					'createLimitOrder',
					'createMarketOrder',
					'cancelOrder',
					'cancelAllOrders',
					'closePosition',
				]).describe('The trading action to perform'),
				marketIndex: z.number().describe('Market index (0=BTC, 1=ETH, 2=SOL)'),
				side: z.enum(['long', 'short']).optional().describe('Position side: long (buy) or short (sell)'),
				size: z.number().optional().describe('Order size in contracts'),
				price: z.number().optional().describe('Limit price (required for limit orders)'),
				slippage: z.number().optional().describe('Slippage tolerance % for market orders (default: 0.5)'),
				orderIndex: z.number().optional().describe('Order index to cancel (for cancelOrder)'),
				reduceOnly: z.boolean().optional().describe('If true, order can only reduce position'),
				postOnly: z.boolean().optional().describe('If true, order is maker only (limit orders)'),
			}),
			func: async ({ action, marketIndex, side, size, price, slippage, orderIndex, reduceOnly, postOnly }) => {
				const headers: IDataObject = {
					'Content-Type': 'application/json',
				};
				if (backendSecret) {
					headers['X-API-Secret'] = backendSecret;
				}

				let endpoint = '';
				let body: IDataObject = {};

				switch (action) {
					case 'createLimitOrder':
						if (!side || !size || price === undefined) {
							return JSON.stringify({
								error: 'Missing required parameters',
								required: { side: 'long or short', size: 'number', price: 'number' }
							});
						}
						endpoint = '/api/order/limit';
						body = {
							market_index: marketIndex,
							side,
							size,
							price,
							reduce_only: reduceOnly || false,
							post_only: postOnly || false,
						};
						break;

					case 'createMarketOrder':
						if (!side || !size) {
							return JSON.stringify({
								error: 'Missing required parameters',
								required: { side: 'long or short', size: 'number' }
							});
						}
						endpoint = '/api/order/market';
						body = {
							market_index: marketIndex,
							side,
							size,
							slippage: slippage || 0.5,
							reduce_only: reduceOnly || false,
						};
						break;

					case 'cancelOrder':
						if (orderIndex === undefined) {
							return JSON.stringify({
								error: 'Missing required parameter: orderIndex',
								hint: 'Use lighter_account tool with action=getActiveOrders to find order IDs'
							});
						}
						endpoint = '/api/order/cancel';
						body = {
							market_index: marketIndex,
							order_index: orderIndex,
						};
						break;

					case 'cancelAllOrders':
						endpoint = '/api/order/cancel-all';
						body = {
							market_index: marketIndex >= 0 ? marketIndex : undefined,
						};
						break;

					case 'closePosition':
						endpoint = '/api/position/close';
						body = {
							market_index: marketIndex,
							slippage: slippage || 0.5,
						};
						break;
				}

				try {
					const response = await this.helpers.request({
						method: 'POST',
						url: `${backendUrl}${endpoint}`,
						headers,
						body,
						json: true,
					});

					// Format response for AI readability
					const result = response as IDataObject;

					if (result.success || result.tx_hash || result.order_id) {
						const successResponse: IDataObject = {
							status: 'SUCCESS',
							action,
							marketIndex,
						};

						if (action === 'createLimitOrder' || action === 'createMarketOrder') {
							successResponse.orderId = result.order_id;
							successResponse.side = side;
							successResponse.size = size;
							if (price) successResponse.price = price;
						}

						if (result.tx_hash) {
							successResponse.transactionHash = result.tx_hash;
						}

						return JSON.stringify(successResponse, null, 2);
					}

					return JSON.stringify({
						status: 'RESPONSE',
						action,
						data: result,
					}, null, 2);

				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					return JSON.stringify({
						status: 'ERROR',
						action,
						error: errorMessage,
						hint: 'Check if the trading backend is running and credentials are correct'
					});
				}
			},
		});

		return {
			response: tool,
		};
	}
}
