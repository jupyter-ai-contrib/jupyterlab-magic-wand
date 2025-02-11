import { PartialJSONValue, Token } from '@lumino/coreutils';

export const IMagicProvider = new Token<IMagicProvider>(
  'jupyterlab-magic-wand:IMagicProvider'
);

export interface IMagicProvider {
  magic(context: IMagicProvider.IMagicContext): Promise<void>;
}

export namespace IMagicProvider {
  export interface IMagicContext {
    cellId: string;
    codeInput: string;
    content: PartialJSONValue | undefined;
  }
}
