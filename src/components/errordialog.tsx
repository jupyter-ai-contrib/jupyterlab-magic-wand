import * as React from 'react';
import { wandIcon } from '../icon';
import { showDialog, Dialog } from '@jupyterlab/apputils';

export const timeoutDialog = (code: string | undefined) => {
  showDialog({
    title: (
      <div className="jp-MagicDialog-header">
        <wandIcon.react tag="div" className="jp-MagicDialog-icon" />
        <div className="jp-MagicDialog-title">
          Oops! The magic button timed out.
        </div>
      </div>
    ),
    body: (
      <div>
        <p>
          The magic button timed out in the cell with the following content:
        </p>
        <pre className="jp-MagicDialog-code">
          <code>{code}</code>
        </pre>
        <p>
          We recommend that you try again. If the problem persists, please open
          an issue on Github!
        </p>
      </div>
    ),
    buttons: [Dialog.okButton()]
  });
};

export const errorDialog = (
  errorType: string | undefined,
  message: string | undefined
) => {
  showDialog({
    title: (
      <div className="jp-MagicDialog-header">
        <wandIcon.react tag="div" className="jp-MagicDialog-icon" />
        <div className="jp-MagicDialog-title">Oops! {errorType}</div>
      </div>
    ),
    body: (
      <div>
        <p></p>
        <pre className="jp-MagicDialog-code">
          <code>{message}</code>
        </pre>
        <p>
          We recommend that you try again. If the problem persists, please open
          an issue on Github!
        </p>
      </div>
    ),
    buttons: [Dialog.okButton()]
  });
};
