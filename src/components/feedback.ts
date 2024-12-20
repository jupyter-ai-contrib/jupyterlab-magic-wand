// import React from 'react';
import {
  // showDialog,
  Dialog
} from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

interface ITextArea extends HTMLElement {
  value: string;
}

const DESCRIPTION = `
Please share if something went wrong in this particular cell. Your feedback is appreciated! 
`;

class TextAreaWidget extends Widget {
  private _textArea: ITextArea;

  constructor() {
    super();
    const paragraph = document.createElement('p');
    paragraph.className = 'jp-AI-Feedback-paragraph';
    paragraph.innerText = DESCRIPTION;
    this._textArea = document.createElement('textarea');
    this._textArea.className = 'jp-AI-Feedback-TextArea';
    this._textArea.setAttribute('enterkeyhint', 'enter');
    this.node.enterKeyHint = 'go';
    this.node.appendChild(paragraph);
    this.node.appendChild(this._textArea);
  }

  getValue(): string | undefined | null {
    return this._textArea.value;
  }
}

class FeedbackDialog extends Dialog<void> {
  handleEvent(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      return;
    }
    super.handleEvent(event);
  }
}

export const requestFeedback = function () {
  const dialog = new FeedbackDialog({
    title: 'AI Assistant Feedback',
    body: new TextAreaWidget(),
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({
        label: 'Submit'
      })
    ]
  });
  return dialog.launch();
};
