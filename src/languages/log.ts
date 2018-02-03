import "monaco-editor";

export const Log = {
  MonarchTokensProvider: {
    tokenizer: {
      root: [
        [/\[error.*/, "custom-error"],
        [/\[notice.*/, "custom-notice"],
        [/\[info.*/, "custom-info"],
      ],
    },
  },
};
