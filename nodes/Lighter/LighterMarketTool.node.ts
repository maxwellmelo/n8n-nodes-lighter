import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	IDataObject,
} from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class LighterMarketTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lighter Market Tool',
		name: 'lighterMarketTool',
		icon: 'file:lighter.svg',
		group: ['transform'],
		version: 1,
		description: 'Query Lighter market data - prices, orderbooks, funding rates, stats for AI agents',
		defaults: {
			name: 'Lighter Market',
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
		// @ts-ignore - AI Tool output
		inputs: [],
		// @ts-ignore - AI Tool output
		outputs: [NodeConnectionType.AiTool],
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

		const tool = new DynamicStructuredTool({
			name: 'lighter_market',
			description: `Query Lighter DEX market data. Use this tool to:
- Get current prices and 24h stats for all markets
- Get orderbook depth for specific markets
- Get funding rates (important for perpetuals)
- Get recent trades
- Get exchange statistics

Available markets: BTC-PERP (0), ETH-PERP (1), SOL-PERP (2), and more.
The Lighter DEX is a high-performance perpetuals trading platform on zkSync.`,
			schema: z.object({
				action: z.enum([
					'getMarkets',
					'getOrderbook',
					'getFundingRates',
					'getRecentTrades',
					'getExchangeStats',
				]).describe('The action to perform'),
				marketIndex: z.number().optional().describe('Market index (0=BTC, 1=ETH, 2=SOL). Required for orderbook and trades.'),
				limit: z.number().optional().describe('Number of results to return (default: 20)'),
			}),
			func: async ({ action, marketIndex, limit }) => {
				let endpoint = '';
				const qs: IDataObject = {};

				switch (action) {
					case 'getMarkets':
						endpoint = '/api/v1/orderBooks';
						break;

					case 'getOrderbook':
						if (marketIndex === undefined) {
							return JSON.stringify({ error: 'marketIndex is required for getOrderbook' });
						}
						endpoint = '/api/v1/orderBookDetails';
						qs.order_book_id = marketIndex;
						qs.levels = limit || 10;
						break;

					case 'getFundingRates':
						endpoint = '/api/v1/funding-rates';
						break;

					case 'getRecentTrades':
						if (marketIndex === undefined) {
							return JSON.stringify({ error: 'marketIndex is required for getRecentTrades' });
						}
						endpoint = '/api/v1/recentTrades';
						qs.order_book_id = marketIndex;
						qs.limit = limit || 20;
						break;

					case 'getExchangeStats':
						endpoint = '/api/v1/exchangeStats';
						break;
				}

				try {
					const response = await this.helpers.request({
						method: 'GET',
						url: `${baseUrl}${endpoint}`,
						qs,
						json: true,
					});

					// Format response for AI readability
					if (action === 'getMarkets') {
						const markets = response as IDataObject[];
						const formattedMarkets = markets.map((m: IDataObject) => ({
							index: m.id,
							symbol: m.symbol,
							markPrice: m.mark_price,
							indexPrice: m.index_price,
							change24h: m.price_change_24h,
							volume24h: m.volume_24h,
							openInterest: m.open_interest,
							fundingRate: m.funding_rate,
						}));
						return JSON.stringify({
							markets: formattedMarkets,
							marketCount: markets.length,
						}, null, 2);
					}

					if (action === 'getOrderbook') {
						const orderbook = response as IDataObject;
						return JSON.stringify({
							market: orderbook.order_book_id,
							bestBid: (orderbook.bids as IDataObject[])?.[0],
							bestAsk: (orderbook.asks as IDataObject[])?.[0],
							spread: orderbook.spread,
							bids: (orderbook.bids as IDataObject[])?.slice(0, 5),
							asks: (orderbook.asks as IDataObject[])?.slice(0, 5),
						}, null, 2);
					}

					if (action === 'getFundingRates') {
						const rates = response as IDataObject[];
						const formattedRates = rates.map((r: IDataObject) => ({
							market: r.order_book_id,
							symbol: r.symbol,
							fundingRate: r.funding_rate,
							nextFundingTime: r.next_funding_time,
							annualizedRate: Number(r.funding_rate) * 365 * 24,
						}));
						return JSON.stringify({
							fundingRates: formattedRates,
							note: 'Funding rate is hourly. Positive means longs pay shorts.',
						}, null, 2);
					}

					if (action === 'getRecentTrades') {
						const trades = response as IDataObject[];
						const formattedTrades = trades.slice(0, 10).map((t: IDataObject) => ({
							price: t.price,
							size: t.size,
							side: t.is_taker_ask ? 'SELL' : 'BUY',
							time: t.timestamp,
						}));
						return JSON.stringify({
							recentTrades: formattedTrades,
							tradeCount: trades.length,
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
