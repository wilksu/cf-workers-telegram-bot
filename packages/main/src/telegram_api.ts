/**
 * telegram_api.ts
 * 
 * Enhancements:
 * - Added setMyCommands method
 * - Implemented basic rate limiting (30 requests per second)
 */

export interface TelegramApiResponse<T> {
    ok: boolean;
    result: T;
    description?: string;
}

export interface SendMessageParams {
    chat_id: string;
    text: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    reply_to_message_id?: string;
    business_connection_id?: string;
    [key: string]: any; // 允许额外的参数
}

export interface SendPhotoParams {
    chat_id: string;
    photo: string; // URL 或 file_id
    caption?: string;
    reply_to_message_id?: string;
    business_connection_id?: string;
    [key: string]: any; // 允许额外的参数
}

export interface SendVideoParams {
    chat_id: string;
    video: string; // URL 或 file_id
    caption?: string;
    reply_to_message_id?: string;
    business_connection_id?: string;
    [key: string]: any; // 允许额外的参数
}

export interface SendDocumentParams {
    chat_id: string;
    document: Blob | string; // Blob 对象或 file_id
    caption?: string;
    reply_to_message_id?: string;
    business_connection_id?: string; // 仅适用于业务消息
    [key: string]: any; // 允许额外的参数
}

export interface SendChatActionParams {
    chat_id: string;
    action: 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_audio' | 'upload_audio' | 'upload_document' | 'find_location';
    business_connection_id?: string; // 仅适用于业务消息
    [key: string]: any; // 允许额外的参数
}

export interface AnswerInlineParams {
    inline_query_id: string;
    results: InlineQueryResult[];
    cache_time?: number;
    is_personal?: boolean;
    next_offset?: string;
    switch_pm_text?: string;
    switch_pm_parameter?: string;
    [key: string]: any; // 允许额外的参数
}

export interface AnswerCallbackParams {
    callback_query_id: string;
    text?: string;
    show_alert?: boolean;
    url?: string;
    cache_time?: number;
    [key: string]: any; // 允许额外的参数
}

export interface GetFileParams {
    file_id: string;
}

export type InlineQueryResult = InlineQueryResultArticle | InlineQueryResultPhoto | InlineQueryResultVideo;

export interface InlineQueryResultArticle {
    type: 'article';
    id: string;
    title: string;
    input_message_content: {
        message_text: string;
        parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    };
    [key: string]: any; // 允许额外的参数
}

export interface InlineQueryResultPhoto {
    type: 'photo';
    id: string;
    photo_url: string;
    thumb_url: string;
    caption?: string;
    [key: string]: any; // 允许额外的参数
}

export interface InlineQueryResultVideo {
    type: 'video';
    id: string;
    video_url: string;
    mime_type: string;
    thumb_url: string;
    title: string;
    caption?: string;
    [key: string]: any; // 允许额外的参数
}

export interface BotCommand {
    command: string;
    description: string;
}

export default class TelegramApi {
    private apiUrl: string;
    private static requestCount: number = 0;
    private static resetTime: number = Date.now() + 1000;

    /**
     * 构造函数
     * @param token - Telegram Bot 的 Token
     */
    constructor(token: string) {
        this.apiUrl = `https://api.telegram.org/bot${token}`;
    }

    /**
     * 简单的速率限制器，限制每秒最多30个请求
     */
    private async rateLimit() {
        const now = Date.now();
        if (now > TelegramApi.resetTime) {
            TelegramApi.resetTime = now + 1000;
            TelegramApi.requestCount = 0;
        }
        if (TelegramApi.requestCount >= 30) {
            const waitTime = TelegramApi.resetTime - now;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            TelegramApi.resetTime = Date.now() + 1000;
            TelegramApi.requestCount = 0;
        }
        TelegramApi.requestCount++;
    }

    /**
     * 设置机器人命令列表
     * @param commands - 命令数组
     * @returns Telegram API 的响应
     */
    async setMyCommands(commands: BotCommand[]): Promise<TelegramApiResponse<any>> {
        await this.rateLimit();
        return await this.post<any>('setMyCommands', { commands });
    }

    /**
     * 通用的 POST 请求方法
     * @param endpoint - Telegram API 的端点
     * @param body - 请求体
     * @returns 解析后的 JSON 响应
     */
    private async post<T>(endpoint: string, body: any): Promise<TelegramApiResponse<T>> {
        await this.rateLimit();
        try {
            const response = await fetch(`${this.apiUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            return data as TelegramApiResponse<T>;
        } catch (error) {
            console.error(`Error in POST ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * 通用的 GET 请求方法
     * @param endpoint - Telegram API 的端点
     * @param params - 查询参数
     * @returns 解析后的 JSON 响应
     */
    private async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<TelegramApiResponse<T>> {
        await this.rateLimit();
        try {
            const query = new URLSearchParams(params as any).toString();
            const response = await fetch(`${this.apiUrl}/${endpoint}?${query}`, {
                method: 'GET',
            });

            const data = await response.json();
            return data as TelegramApiResponse<T>;
        } catch (error) {
            console.error(`Error in GET ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * 发送文本消息
     * @param params - 发送消息的参数
     * @returns Telegram API 的响应
     */
    async sendMessage(params: SendMessageParams): Promise<TelegramApiResponse<any>> {
        return await this.post<any>('sendMessage', params);
    }

    /**
     * 发送照片
     * @param params - 发送照片的参数
     * @returns Telegram API 的响应
     */
    async sendPhoto(params: SendPhotoParams): Promise<TelegramApiResponse<any>> {
        return await this.post<any>('sendPhoto', params);
    }

    /**
     * 发送视频
     * @param params - 发送视频的参数
     * @returns Telegram API 的响应
     */
    async sendVideo(params: SendVideoParams): Promise<TelegramApiResponse<any>> {
        return await this.post<any>('sendVideo', params);
    }

    /**
     * 发送文档
     * @param params - 发送文档的参数
     * @returns Telegram API 的响应
     */
    async sendDocument(params: SendDocumentParams): Promise<TelegramApiResponse<any>> {
        // 如果 document 是 Blob 对象，则需要使用 multipart/form-data 发送
        if (params.document instanceof Blob) {
            const formData = new FormData();
            formData.append('chat_id', params.chat_id);
            formData.append('document', params.document, 'document.txt'); // 可以根据需要设置文件名
            if (params.caption) formData.append('caption', params.caption);
            if (params.reply_to_message_id) formData.append('reply_to_message_id', params.reply_to_message_id);
            if (params.business_connection_id) formData.append('business_connection_id', params.business_connection_id);
            // 处理额外的参数
            for (const key in params) {
                if (!['chat_id', 'document', 'caption', 'reply_to_message_id', 'business_connection_id'].includes(key)) {
                    formData.append(key, params[key].toString());
                }
            }

            try {
                const response = await fetch(`${this.apiUrl}/sendDocument`, {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                return data as TelegramApiResponse<any>;
            } catch (error) {
                console.error('Error in sendDocument with Blob:', error);
                throw error;
            }
        } else {
            // 如果 document 是 file_id 或 URL，使用 JSON 发送
            return await this.post<any>('sendDocument', params);
        }
    }

    /**
     * 发送聊天动作（如 typing）
     * @param params - 发送聊天动作的参数
     * @returns Telegram API 的响应
     */
    async sendChatAction(params: SendChatActionParams): Promise<TelegramApiResponse<any>> {
        return await this.post<any>('sendChatAction', params);
    }

    /**
     * 回复内联查询
     * @param params - 回复内联查询的参数
     * @returns Telegram API 的响应
     */
    async answerInline(params: AnswerInlineParams): Promise<TelegramApiResponse<any>> {
        return await this.post<any>('answerInlineQuery', params);
    }

    /**
     * 回复回调查询
     * @param params - 回复回调查询的参数
     * @returns Telegram API 的响应
     */
    async answerCallback(params: AnswerCallbackParams): Promise<TelegramApiResponse<any>> {
        return await this.post<any>('answerCallbackQuery', params);
    }

    /**
     * 获取文件信息
     * @param params - 获取文件信息的参数
     * @param token - Telegram Bot 的 Token（用于生成文件下载链接）
     * @returns 文件下载的响应
     */
    async getFile(params: GetFileParams, token: string): Promise<Response> {
        await this.rateLimit();
        if (!params.file_id) {
            return new Response('file_id is required', { status: 400 });
        }
        const data = await this.get<{ file_path: string }>('getFile', params);
        if (data.ok) {
            const file_path = data.result.file_path;
            return await fetch(`https://api.telegram.org/file/bot${token}/${file_path}`);
        } else {
            console.error('Error in getFile:', data.description);
            return new Response(`Error: ${data.description}`, { status: 400 });
        }
    }
}
