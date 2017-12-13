
import {JsonSchema} from 'tv4';
import {Application} from 'express';

type OneOrMany<T> = T | T[];
type JsonValue = OneOrMany<string | number | boolean | null | {[key: string]: JsonValue}>;

declare function load(def: load.ExtractedApi, callback: Function);

declare namespace load {
  interface Resources {
    [route: string]: {
      [method: string]: {
        [status: string]: {
          _ref: string;
          schema: JsonSchema;
          example: JsonValue;
        }
      }
    }
  }
  interface Definitions {
    [ref: string]: JsonSchema;
  }
  interface ExtractedApi {
    resources: Resources;
  }
  interface CreateAppOptions {
    api: ExtractedApi;
    forceExample?: boolean;
    hooks?: {
      [route: string]: {
        [method: string]: (sample: any, req: Request, res: Response) => any;
      }
    }
    refs?: any;
    statuses?: (number | string)[];
    log: (...message: string[]) => any;
  }
  function createApp(options: CreateAppOptions): Application;
  function extract(schema: JsonSchema): {resources: Resources, definitions: Definitions};
}

export = load;
