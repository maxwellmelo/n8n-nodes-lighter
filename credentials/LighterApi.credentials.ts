import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LighterApi implements ICredentialType {
	name = 'lighterApi';
	displayName = 'Lighter API';
	documentationUrl = 'https://apidocs.lighter.xyz/docs/get-started-for-programmers-1';
	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'mainnet',
			options: [
				{
					name: 'Mainnet',
					value: 'mainnet',
				},
				{
					name: 'Testnet',
					value: 'testnet',
				},
			],
			description: 'Select the Lighter network environment',
		},
		{
			displayName: 'Account Index',
			name: 'accountIndex',
			type: 'number',
			default: 0,
			required: true,
			description: 'Your Lighter account index. Find it using the accountsByL1Address endpoint.',
		},
		{
			displayName: 'API Key Index',
			name: 'apiKeyIndex',
			type: 'number',
			default: 3,
			required: true,
			description: 'The API key index (3-254). Indices 0-2 are reserved for desktop/mobile apps.',
		},
		{
			displayName: 'API Private Key',
			name: 'apiPrivateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Lighter API private key for signing transactions',
		},
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Pre-generated auth token for API requests. If empty, public endpoints will be used.',
			hint: 'Generate using the SDK: client.create_auth_token_with_expiry()',
		},
		{
			displayName: 'L1 Address (Optional)',
			name: 'l1Address',
			type: 'string',
			default: '',
			description: 'Your Ethereum L1 address (optional, for convenience)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{$credentials.authToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.environment === "mainnet" ? "https://mainnet.zklighter.elliot.ai" : "https://testnet.zklighter.elliot.ai"}}',
			url: '/api/v1/status',
			method: 'GET',
		},
	};
}
