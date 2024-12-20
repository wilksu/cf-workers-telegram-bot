import { describe, it, expect } from 'vitest';
import TelegramBot from '../src/telegram_bot.js';
import TelegramApi, { BotCommand } from '../src/telegram_api.js';
import { UpdateType } from '../src/types/UpdateType.js';

// Mock TelegramApi
class MockTelegramApi extends TelegramApi {
    constructor(token: string) {
        super(token);
    }

    async setMyCommands(commands: BotCommand[]): Promise<any> {
        // Mock implementation
        return { ok: true, result: true };
    }

    async sendMessage(params: any): Promise<any> {
        // Mock implementation
        return { ok: true, result: {} };
    }

    async sendPhoto(params: any): Promise<any> {
        return { ok: true, result: {} };
    }

    async sendVideo(params: any): Promise<any> {
        return { ok: true, result: {} };
    }

    async sendDocument(params: any): Promise<any> {
        return { ok: true, result: {} };
    }

    async sendChatAction(params: any): Promise<any> {
        return { ok: true, result: {} };
    }

    async answerInline(params: any): Promise<any> {
        return { ok: true, result: {} };
    }

    async getFile(params: any, token: string): Promise<any> {
        return new Response('file content');
    }
}

describe('telegram bot', () => {
    it('inline response', async () => {
        const mockApi = new MockTelegramApi('123456789');
        const bot = new TelegramBot('123456789', mockApi)
            .onEvent(UpdateType.Inline, async () => {
                return new Response('ok');
            });
        await bot.initializeCommands();

        const request = new Request('http://example.com/123456789', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inline_query: { id: '1', query: 'hello' } }),
        });

        const response = await bot.handle(request);
        expect(await response.text()).toBe('ok');
        expect(bot.currentContext.update_type).toBe(UpdateType.Inline);
    });

    it('message response', async () => {
        const mockApi = new MockTelegramApi('123456789');
        const bot = new TelegramBot('123456789', mockApi)
            .onCommand('start', 'Start command', async () => {
                return new Response('ok');
            });
        await bot.initializeCommands();

        const request = new Request('http://example.com/123456789', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { text: '/start' } }),
        });

        const response = await bot.handle(request);
        expect(await response.text()).toBe('ok');
        expect(bot.currentContext.update_type).toBe(UpdateType.Message);
        expect(bot.currentContext.command).toBe('start');
    });

    it('non-command message response', async () => {
        const mockApi = new MockTelegramApi('123456789');
        const bot = new TelegramBot('123456789', mockApi)
            .onEvent(UpdateType.Message, async () => {
                return new Response('non-command');
            });
        await bot.initializeCommands();

        const request = new Request('http://example.com/123456789', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { text: 'hello' } }),
        });

        const response = await bot.handle(request);
        expect(await response.text()).toBe('non-command');
        expect(bot.currentContext.update_type).toBe(UpdateType.Message);
        expect(bot.currentContext.command).toBe(null);
    });
});
