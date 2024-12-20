import TelegramUpdate from './types/TelegramUpdate.js';
import TelegramExecutionContext from './telegram_execution_context.js';
import Webhook from './webhook.js';
import TelegramApi, { BotCommand } from './telegram_api.js';
import { UpdateType } from './types/UpdateType.js';

export default class TelegramBot {
    /** The telegram token */
    token: string;
    /** The telegram api instance */
    api: TelegramApi;
    /** The telegram webhook object */
    webhook: Webhook = new Webhook('', new Request('http://127.0.0.1'));
    /** The telegram update object */
    update: TelegramUpdate = new TelegramUpdate({});
    /** The telegram commands record map */
    commands: Record<string, (ctx: TelegramExecutionContext) => Promise<Response>> = {};
    /** The telegram events record map */
    events: Record<string, (ctx: TelegramExecutionContext) => Promise<Response>> = {};
    /** The list of commands for setMyCommands */
    commandList: BotCommand[] = [];
    /** The current bot context */
    currentContext!: TelegramExecutionContext;

    /**
     * Create a bot
     * @param token - the telegram secret token
     * @param api - the TelegramApi instance (dependency injection)
     */
    constructor(token: string, api: TelegramApi = new TelegramApi(token)) {
        this.token = token;
        this.api = api;
        console.log('TelegramBot initialized with token:', token);
    }

    /**
     * Register a command with description
     * @param command - the command name (without '/')
     * @param description - the command description
     * @param callback - the handler function
     */
    onCommand(command: string, description: string, callback: (ctx: TelegramExecutionContext) => Promise<Response>) {
        this.commands[command] = callback;
        this.commandList.push({ command, description });
        console.log(`Registered command: /${command} - ${description}`);
        return this;
    }

    /**
     * Register an event listener
     * @param event - the event name (from UpdateType)
     * @param callback - the handler function
     */
    onEvent(event: UpdateType, callback: (ctx: TelegramExecutionContext) => Promise<Response>) {
        this.events[event] = callback;
        console.log(`Registered event: ${event}`);
        return this;
    }

    /**
     * Initialize commands by setting them to Telegram via setMyCommands API
     */
    async initializeCommands(): Promise<TelegramBot> {
        if (this.commandList.length > 0) {
            try {
                const response = await this.api.setMyCommands(this.commandList);
                if (response.ok) {
                    console.log('Successfully set bot commands.');
                } else {
                    console.error('Failed to set bot commands:', response.description);
                }
            } catch (error) {
                console.error('Error setting bot commands:', error);
            }
        }
        return this;
    }

    /**
     * Handle a request on a given bot
     * @param request - the request to handle
     */
    async handle(request: Request): Promise<Response> {
        try {
            this.webhook = new Webhook(this.token, request);
            const url = new URL(request.url);
            if (`/${this.token}` === url.pathname) {
                switch (request.method) {
                    case 'POST': {
                        this.update = await request.json();
                        console.log('Received update:', this.update);
                        const ctx = new TelegramExecutionContext(this, this.update);
                        this.currentContext = ctx;

                        // Dispatch based on update type
                        if (ctx.update_type) {
                            if (ctx.command && this.commands[ctx.command]) {
                                console.log(`Dispatching command: /${ctx.command}`);
                                return await this.commands[ctx.command](ctx);
                            } else if (this.events[ctx.update_type]) {
                                console.log(`Dispatching event: ${ctx.update_type}`);
                                return await this.events[ctx.update_type](ctx);
                            } else {
                                console.warn('No handler found for:', ctx.update_type);
                                return new Response('No handler for this update type', { status: 400 });
                            }
                        } else {
                            console.warn('Unhandled update type:', this.update);
                            return new Response('Unhandled update type', { status: 400 });
                        }
                    }
                    case 'GET': {
                        switch (url.searchParams.get('command')) {
                            case 'set':
                                return await this.webhook.set();
                            default:
                                break;
                        }
                        break;
                    }

                    default:
                        break;
                }
            }
            return new Response('ok');
        } catch (error) {
            console.error('Error handling request:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
}
