import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	IDataObject,
} from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class LighterAccountTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lighter Account Tool',
		name: 'lighterAccountTool',
		icon: 'file:lighter.svg',
		group: ['transform'],
		version: 1,
		description: 'Query Lighter account information - balance, positions, PnL, orders for AI agents',
		defaults: {
			name: 'Lighter Account',
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
		const environment = credentials.environment as string;
		const baseUrl =
			environment === 'mainnet'
				? 'https://mainnet.zklighter.elliot.ai'
				: 'https://testnet.zklighter.elliot.ai';
		const authToken = credentials.authToken as string;
		const defaultAccountIndex = credentials.accountIndex as number;

		const tool = new DynamicStructuredTool({
			name: 'lighter_account',
			description: `Query Lighter DEX account information. Use this tool to:
- Get account balance and equity
- Get open positions with PnL
- Get active orders
- Get account trading limits
- Get PnL history

The Lighter DEX is a high-performance perpetuals trading platform on zkSync.`,
			schema: z.object({
				action: z.enum([
					'getAccount',
					'getPositions',
					'getActiveOrders',
					'getAccountLimits',
					'getPnl',
				]).describe('The action to perform'),
				accountIndex: z.number().optional().describe(`Account index to query. Default: ${defaultAccountIndex}`),
				marketIndex: z.number().optional().describe('Market index for filtering (0=BTC, 1=ETH, etc.)'),
			}),
			func: async ({ action, accountIndex, marketIndex }) => {
				const account = accountIndex ?? defaultAccountIndex;
				let endpoint = '';
				const qs: IDataObject = {};
				const headers: IDataObject = {};

				if (authToken) {
					headers['Authorization'] = authToken;
				}

				switch (action) {
					case 'getAccount':
						endpoint = '/api/v1/account';
						qs.by = 'index';
						qs.value = account;
						break;

					case 'getPositions':
						endpoint = '/api/v1/account';
						qs.by = 'index';
						qs.value = account;
						break;

					case 'getActiveOrders':
						endpoint = '/api/v1/accountActiveOrders';
						qs.account_index = account;
						if (marketIndex !== undefined) {
							qs.order_book_id = marketIndex;
						}
						break;

					case 'getAccountLimits':
						endpoint = '/api/v1/accountLimits';
						qs.account_index = account;
						break;

					case 'getPnl':
						endpoint = '/api/v1/pnl';
						qs.account_index = account;
						qs.resolution = '1h';
						qs.limit = 24;
						break;
				}

				try {
					const response = await this.helpers.request({
						method: 'GET',
						url: `${baseUrl}${endpoint}`,
						qs,
						headers,
						json: true,
					});

					// Format response for AI readability
					if (action === 'getAccount' || action === 'getPositions') {
						const accountData = response as IDataObject;
						const positions = (accountData.open_positions as IDataObject[]) || [];
						const formattedPositions = positions.map((p: IDataObject) => ({
							market: p.order_book_id,
							side: Number(p.size) > 0 ? 'LONG' : 'SHORT',
							size: Math.abs(Number(p.size)),
							entryPrice: p.avg_entry_price,
							markPrice: p.mark_price,
							unrealizedPnl: p.unrealized_pnl,
							leverage: p.leverage,
						}));

						return JSON.stringify({
							accountIndex: accountData.index,
							equity: accountData.equity,
							freeCollateral: accountData.free_collateral,
							marginUsage: accountData.margin_usage,
							positions: formattedPositions,
							positionCount: positions.length,
						}, null, 2);
					}

					if (action === 'getActiveOrders') {
						const orders = (response as IDataObject[]) || [];
						const formattedOrders = orders.map((o: IDataObject) => ({
							orderId: o.id,
							market: o.order_book_id,
							side: o.is_ask ? 'SELL' : 'BUY',
							type: o.type,
							price: o.price,
							size: o.size,
							filled: o.filled_size,
							status: o.status,
						}));
						return JSON.stringify({
							activeOrders: formattedOrders,
							orderCount: orders.length,
						}, null, 2);
					}

					return JSON.stringify(response, null, 2);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					return JSON.stringify({ error: errorMessage });
				}
			},
		});

		return {
			response: tool,
		};
	}
}
