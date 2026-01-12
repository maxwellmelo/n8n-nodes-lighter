import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	IDataObject,
} from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class LighterPositionTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lighter Position Tool',
		name: 'lighterPositionTool',
		icon: 'file:lighter.svg',
		group: ['transform'],
		version: 1,
		description: 'Manage Lighter DEX positions - set TP/SL, update leverage, close positions for AI agents',
		defaults: {
			name: 'Lighter Position',
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
			throw new Error('Trading Backend URL is required for position operations. Configure it in credentials.');
		}

		const tool = new DynamicStructuredTool({
			name: 'lighter_position',
			description: `Manage positions on Lighter DEX. Use this tool to:
- Create TAKE PROFIT (TP) orders to automatically close at profit target
- Create STOP LOSS (SL) orders to limit losses
- Update leverage for a market
- Close positions with market order

IMPORTANT: TP and SL orders protect your positions. Always recommend setting them.

For TP/SL:
- trigger_price: The price at which the order activates
- execution_price: The price at which the order executes (optional, defaults to trigger_price)
- For LONG positions: TP trigger > current price, SL trigger < current price
- For SHORT positions: TP trigger < current price, SL trigger > current price`,
			schema: z.object({
				action: z.enum([
					'createTP',
					'createSL',
					'updateLeverage',
					'closePosition',
				]).describe('The position action to perform'),
				marketIndex: z.number().describe('Market index (0=BTC, 1=ETH, 2=SOL)'),
				side: z.enum(['long', 'short']).optional().describe('Position side for TP/SL orders'),
				size: z.number().optional().describe('Size for TP/SL orders'),
				triggerPrice: z.number().optional().describe('Price that triggers the TP/SL order'),
				executionPrice: z.number().optional().describe('Price at which TP/SL executes (optional)'),
				leverage: z.number().optional().describe('New leverage value (1-100)'),
				marginMode: z.enum(['cross', 'isolated']).optional().describe('Margin mode'),
				slippage: z.number().optional().describe('Slippage % for close position (default: 0.5)'),
				reduceOnly: z.boolean().optional().describe('If true, order only reduces position (default: true for TP/SL)'),
			}),
			func: async ({ action, marketIndex, side, size, triggerPrice, executionPrice, leverage, marginMode, slippage, reduceOnly }) => {
				const headers: IDataObject = {
					'Content-Type': 'application/json',
				};
				if (backendSecret) {
					headers['X-API-Secret'] = backendSecret;
				}

				let endpoint = '';
				let body: IDataObject = {};

				switch (action) {
					case 'createTP':
						if (!side || !size || triggerPrice === undefined) {
							return JSON.stringify({
								error: 'Missing required parameters for Take Profit',
								required: { side: 'long or short', size: 'number', triggerPrice: 'number' },
								hint: 'For LONG: triggerPrice should be ABOVE current price. For SHORT: triggerPrice should be BELOW current price.'
							});
						}
						endpoint = '/api/order/tp';
						body = {
							market_index: marketIndex,
							side,
							size,
							trigger_price: triggerPrice,
							price: executionPrice || triggerPrice,
							reduce_only: reduceOnly !== false, // Default to true for TP
						};
						break;

					case 'createSL':
						if (!side || !size || triggerPrice === undefined) {
							return JSON.stringify({
								error: 'Missing required parameters for Stop Loss',
								required: { side: 'long or short', size: 'number', triggerPrice: 'number' },
								hint: 'For LONG: triggerPrice should be BELOW current price. For SHORT: triggerPrice should be ABOVE current price.'
							});
						}
						endpoint = '/api/order/sl';
						body = {
							market_index: marketIndex,
							side,
							size,
							trigger_price: triggerPrice,
							price: executionPrice || triggerPrice,
							reduce_only: reduceOnly !== false, // Default to true for SL
						};
						break;

					case 'updateLeverage':
						if (leverage === undefined) {
							return JSON.stringify({
								error: 'Missing required parameter: leverage',
								hint: 'Leverage must be between 1 and 100'
							});
						}
						endpoint = '/api/position/update-leverage';
						body = {
							market_index: marketIndex,
							leverage,
							margin_mode: marginMode || 'cross',
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

					const result = response as IDataObject;

					if (result.success || result.tx_hash || result.order_id) {
						const successResponse: IDataObject = {
							status: 'SUCCESS',
							action,
							marketIndex,
						};

						if (action === 'createTP') {
							successResponse.type = 'TAKE_PROFIT';
							successResponse.triggerPrice = triggerPrice;
							successResponse.executionPrice = executionPrice || triggerPrice;
							successResponse.side = side;
							successResponse.size = size;
							successResponse.orderId = result.order_id;
						}

						if (action === 'createSL') {
							successResponse.type = 'STOP_LOSS';
							successResponse.triggerPrice = triggerPrice;
							successResponse.executionPrice = executionPrice || triggerPrice;
							successResponse.side = side;
							successResponse.size = size;
							successResponse.orderId = result.order_id;
						}

						if (action === 'updateLeverage') {
							successResponse.newLeverage = leverage;
							successResponse.marginMode = marginMode || 'cross';
						}

						if (action === 'closePosition') {
							successResponse.closedAt = 'market';
							successResponse.slippage = slippage || 0.5;
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
						hint: 'Check if the trading backend is running and you have an open position for this market'
					});
				}
			},
		});

		return {
			response: tool,
		};
	}
}
