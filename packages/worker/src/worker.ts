import TelegramBot from '../../main/src/telegram_bot';

interface Environment {
	SECRET_TELEGRAM_API_TOKEN: string;
	KV_GET_SET: KVNamespace;
	KV_UID_DATA: KVNamespace;

	SECRET_TELEGRAM_API_TOKEN2: string;

	SECRET_TELEGRAM_API_TOKEN3: string;

	SECRET_TELEGRAM_API_TOKEN4: string;

	SECRET_TELEGRAM_API_TOKEN5: string;

	AI: Ai;

	DB: D1Database;

	R2: R2Bucket;

	CHAT_MODEL: string;
}

export default {
	fetch: async (request: Request, env: Environment) => {
		const bot = new TelegramBot(env.SECRET_TELEGRAM_API_TOKEN);
		await bot
			.on('default', async function () {
				switch (bot.update_type) {
					case 'message': {
						const messages = [
							{ role: 'system', content: 'You are a friendly assistant' },
							{
								role: 'user',
								content: bot.update.message?.text?.toString() ?? '',
							},
						];
						const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages });
						if ('response' in response) {
							await bot.reply(response.response ?? '');
						}
						break;
					}
					case 'inline': {
						const inline_messages = [
							{ role: 'system', content: 'You are a friendly assistant' },
							{
								role: 'user',
								content: bot.update.inline_query?.query.toString() ?? '',
							},
						];
						const inline_response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages: inline_messages, max_tokens: 50 });
						if ('response' in inline_response) {
							await bot.reply(inline_response.response ?? '');
						}
						break;
					}

					default:
						break;
				}
				return new Response('ok');
			})
			.handle(request.clone());
		const bot2 = new TelegramBot(env.SECRET_TELEGRAM_API_TOKEN2);
		await bot2
			.on('default', async function () {
				switch (bot2.update_type) {
					case 'message': {
						await bot2.reply('https://duckduckgo.com/?q=' + encodeURIComponent(bot.update.message?.text?.toString() ?? ''));
						break;
					}
					case 'inline': {
						await bot2.reply('https://duckduckgo.com/?q=' + encodeURIComponent(bot.update.inline_query?.query ?? ''));
						break;
					}

					default:
						break;
				}
				return new Response('ok');
			})
			.handle(request.clone());
		const bot3 = new TelegramBot(env.SECRET_TELEGRAM_API_TOKEN3);
		await bot3
			.on('default', async function () {
				switch (bot3.update_type) {
					case 'inline': {
						const { translated_text } = await env.AI.run('@cf/meta/m2m100-1.2b', {
							text: bot3.update.inline_query?.query.toString() ?? '',
							source_lang: 'french',
							target_lang: 'english',
						});
						await bot3.reply(translated_text ?? '');
						break;
					}

					default:
						break;
				}

				return new Response('ok');
			})
			.handle(request.clone());

		return new Response('ok');
	},
};
