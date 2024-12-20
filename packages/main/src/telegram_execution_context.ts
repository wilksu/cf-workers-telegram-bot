import TelegramApi, {
    SendMessageParams,
    SendPhotoParams,
    SendVideoParams,
    SendDocumentParams,
    SendChatActionParams,
    AnswerInlineParams,
    InlineQueryResult,
    TelegramApiResponse,
} from './telegram_api.js';
import TelegramBot from './telegram_bot.js';
import { UpdateType } from './types/UpdateType.js';
import TelegramUpdate from './types/TelegramUpdate.js';
import { updateTypeMap } from './types/updateTypeMap.js';

/**
 * TelegramExecutionContext.ts
 * 
 * 这个文件负责解析 Telegram 的更新，并提供上下文以便响应不同类型的更新。
 */

export default class TelegramExecutionContext {
    /** TelegramBot 实例 */
    bot: TelegramBot;
    /** Telegram 更新 */
    update: TelegramUpdate;
    /** 更新类型 */
    update_type: UpdateType | null = null;
    /** TelegramApi 实例 */
    api: TelegramApi;
    /** Command name if the update is a command */
    command: string | null = null;

    /**
     * 构造函数
     * @param bot - TelegramBot 实例
     * @param update - Telegram 更新
     */
    constructor(bot: TelegramBot, update: TelegramUpdate) {
        this.bot = bot;
        this.update = update;
        this.api = bot.api; // Utilize the injected TelegramApi instance

        // 使用映射进行更新类型分类
        for (const { type, predicate } of updateTypeMap) {
            if (predicate(update)) {
                this.update_type = type;
                break;
            }
        }

        // 如果是消息类型，检查是否是命令
        if (this.update_type === UpdateType.Message || this.update_type === UpdateType.BusinessMessage) {
            const messageText = this.update.message?.text || this.update.business_message?.text || '';
            if (messageText.startsWith('/')) {
                const parts = messageText.slice(1).split(' ');
                this.command = parts[0];
            }
        }

        // 如果未匹配到任何类型，则设为 null
        if (!this.update_type) {
            console.warn('Unhandled update type:', update);
        }
    }

    /**
     * 获取聊天ID
     */
    private getChatId(): string {
        switch (this.update_type) {
            case UpdateType.Message:
            case UpdateType.Photo:
            case UpdateType.Document:
                return this.update.message?.chat.id.toString() ?? '';
            case UpdateType.BusinessMessage:
                return this.update.business_message?.chat.id.toString() ?? '';
            default:
                return '';
        }
    }

    /**
     * 获取回复的消息ID
     */
    private getReplyToMessageId(): string | undefined {
        switch (this.update_type) {
            case UpdateType.Message:
            case UpdateType.Photo:
            case UpdateType.Document:
                return this.update.message?.message_id.toString();
            case UpdateType.BusinessMessage:
                return this.update.business_message?.message_id.toString();
            default:
                return undefined;
        }
    }

    /**
     * 通用发送消息方法
     * @param options - 发送消息的选项
     * @param context - 上下文，用于错误处理
     */
    private async sendMessage(options: SendMessageParams, context: string = 'sendMessage') {
        try {
            const response = await this.api.sendMessage(options);
            await this.handleApiResponse(response, context);
        } catch (error) {
            console.error(`Exception in ${context}:`, error);
        }
    }

    /**
     * 处理 API 响应
     * @param response - API 响应
     * @param context - 上下文，用于错误处理
     */
    private async handleApiResponse(response: TelegramApiResponse<any>, context: string) {
        if (!response.ok) {
            console.error(`Error in ${context}:`, response.description || 'Unknown error');
            // 可以根据需要进一步处理错误，例如重试、通知管理员等
        }
    }

    /**
     * 回复消息，如果消息过长则发送为文档
     * @param message - 回复的文本内容
     * @param parse_mode - 解析模式（HTML, MarkdownV2, Markdown, 或空字符串）
     * @param options - 额外的发送选项
     */
    async reply(message: string, parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML', options: Record<string, number | string | boolean> = {}) {
        if (!this.update_type) {
            console.warn('No update type set.');
            return;
        }

        const commonOptions = {
            ...options,
            chat_id: this.getChatId(),
            reply_to_message_id: this.getReplyToMessageId(),
            parse_mode,
        };

        const MAX_MESSAGE_LENGTH = 4096;

        if (message.length > MAX_MESSAGE_LENGTH && this.update_type !== UpdateType.Inline) { // 排除 Inline 类型
            // 将超长文本作为文档发送
            const documentOptions: SendDocumentParams = {
                ...commonOptions,
                document: this.createTextDocument(message),
                caption: '这是一个超长文本文件，无法在消息中显示。',
            };
            try {
                const response = await this.api.sendDocument(documentOptions);
                await this.handleApiResponse(response, 'sendDocument');
            } catch (error) {
                console.error('Exception in sendDocument:', error);
            }
        } else {
            switch (this.update_type) {
                case UpdateType.Message:
                case UpdateType.Photo:
                case UpdateType.Document:
                    await this.sendMessage({
                        ...commonOptions,
                        text: message,
                    }, 'sendMessage');
                    break;
                case UpdateType.Inline:
                    try {
                        const results: InlineQueryResult[] = [{
                            type: 'article',
                            id: '1',
                            title: message,
                            input_message_content: {
                                message_text: message,
                                parse_mode: parse_mode || undefined,
                            },
                        }];
                        const response = await this.api.answerInline({
                            inline_query_id: this.update.inline_query?.id.toString() ?? '',
                            results,
                        });
                        await this.handleApiResponse(response, 'answerInline');
                    } catch (error) {
                        console.error('Exception in answerInline:', error);
                    }
                    break;
                case UpdateType.BusinessMessage:
                    await this.api.sendMessage({
                        chat_id: this.update.business_message?.chat.id.toString() ?? '',
                        text: message,
                        business_connection_id: this.update.business_message?.business_connection_id.toString(),
                        parse_mode,
                    }).then(response => this.handleApiResponse(response, 'sendMessage'));
                    break;
                default:
                    console.warn('Unhandled update type:', this.update_type);
                    break;
            }
        }
    }

    /**
     * 创建文本文档
     * @param text - 文本内容
     * @returns Blob 对象
     */
    private createTextDocument(text: string): Blob {
        return new Blob([text], { type: 'text/plain' });
    }

    /**
     * 回复消息并发送照片
     * @param photo - 照片的 URL 或 file_id
     * @param caption - 照片的说明
     * @param options - 额外的发送选项
     */
    async replyPhoto(photo: string, caption = '', options: Record<string, number | string | boolean> = {}) {
        if (!this.update_type) {
            console.warn('No update type set.');
            return;
        }

        const commonOptions: SendPhotoParams = {
            ...options,
            chat_id: this.getChatId(),
            reply_to_message_id: this.getReplyToMessageId(),
            photo,
            caption,
        };

        switch (this.update_type) {
            case UpdateType.Message:
            case UpdateType.Photo:
                await this.api.sendPhoto(commonOptions);
                break;
            case UpdateType.Inline:
                try {
                    const results: InlineQueryResult[] = [{
                        type: 'photo',
                        id: '1',
                        photo_url: photo,
                        thumb_url: photo, // Telegram 要求有 thumb_url
                        caption: caption || undefined,
                    }];
                    const response = await this.api.answerInline({
                        inline_query_id: this.update.inline_query?.id.toString() ?? '',
                        results,
                    });
                    await this.handleApiResponse(response, 'answerInline');
                } catch (error) {
                    console.error('Exception in answerInline:', error);
                }
                break;
            default:
                console.warn('Unhandled update type for replyPhoto:', this.update_type);
                break;
        }
    }

    /**
     * 回复消息并发送视频
     * @param video - 视频的 URL 或 file_id
     * @param options - 额外的发送选项
     */
    async replyVideo(video: string, options: Record<string, number | string | boolean> = {}) {
        if (!this.update_type) {
            console.warn('No update type set.');
            return;
        }

        switch (this.update_type) {
            case UpdateType.Message:
                await this.api.sendVideo({
                    ...options,
                    chat_id: this.getChatId(),
                    reply_to_message_id: this.getReplyToMessageId(),
                    video,
                });
                break;
            case UpdateType.Inline:
                try {
                    const results: InlineQueryResult[] = [{
                        type: 'video',
                        id: '1',
                        video_url: video,
                        mime_type: 'video/mp4',
                        thumb_url: 'https://example.com/thumb.jpg', // 必须提供
                        title: 'Video Title',
                        caption: 'Video Caption',
                    }];
                    const response = await this.api.answerInline({
                        inline_query_id: this.update.inline_query?.id.toString() ?? '',
                        results,
                    });
                    await this.handleApiResponse(response, 'answerInline');
                } catch (error) {
                    console.error('Exception in answerInline:', error);
                }
                break;
            default:
                console.warn('Unhandled update type for replyVideo:', this.update_type);
                break;
        }
    }

    /**
     * 发送“typing”聊天动作
     */
    async sendTyping() {
        if (!this.update_type) {
            console.warn('No update type set.');
            return;
        }

        const actionOptions: SendChatActionParams = {
            chat_id: this.getChatId(),
            action: 'typing',
        };

        switch (this.update_type) {
            case UpdateType.Message:
            case UpdateType.Photo:
            case UpdateType.Document:
                await this.api.sendChatAction(actionOptions);
                break;
            case UpdateType.BusinessMessage:
                await this.api.sendChatAction({
                    ...actionOptions,
                    business_connection_id: this.update.business_message?.business_connection_id.toString(),
                });
                break;
            default:
                console.warn('Unhandled update type for sendTyping:', this.update_type);
                break;
        }
    }

    /**
     * 回复内联查询
     * @param title - 回复的标题
     * @param message - 回复的内容
     * @param parse_mode - 解析模式
     */
    async replyInline(title: string, message: string, parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML') {
        if (this.update_type !== UpdateType.Inline) {
            console.warn('replyInline called on non-inline update type:', this.update_type);
            return;
        }

        try {
            const results: InlineQueryResult[] = [{
                type: 'article',
                id: '1',
                title: title,
                input_message_content: {
                    message_text: message,
                    parse_mode: parse_mode || undefined,
                },
            }];
            const response = await this.api.answerInline({
                inline_query_id: this.update.inline_query?.id.toString() ?? '',
                results,
            });
            await this.handleApiResponse(response, 'answerInline');
        } catch (error) {
            console.error('Exception in replyInline:', error);
        }
    }

    /**
     * 根据 file_id 获取文件
     * @param file_id - Telegram 文件的 file_id
     * @returns 文件的响应对象
     */
    async getFile(file_id: string): Promise<Response> {
        return await this.api.getFile(file_id, this.bot.token);
    }
}
