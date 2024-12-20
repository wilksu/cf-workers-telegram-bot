import { UpdateType } from './UpdateType';
import TelegramUpdate from './TelegramUpdate';

export const updateTypeMap: Array<{ type: UpdateType, predicate: (update: TelegramUpdate) => boolean }> = [
    { type: UpdateType.Photo, predicate: (update) => !!update.message?.photo },
    { type: UpdateType.Document, predicate: (update) => !!update.message?.document },
    { type: UpdateType.Message, predicate: (update) => !!update.message?.text },
    { type: UpdateType.Inline, predicate: (update) => !!update.inline_query?.query },
    { type: UpdateType.Callback, predicate: (update) => !!update.callback_query?.id },
    { type: UpdateType.BusinessMessage, predicate: (update) => !!update.business_message },
];