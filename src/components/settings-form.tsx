import * as React from 'react';

    /**
 * Custom setting renderer for language server extension.
 */
export function renderServerSetting(
    props: FieldProps,
  ): JSX.Element {
    return <SettingRenderer {...props} />;
  }