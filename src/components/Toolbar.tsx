import * as React from "react";

export class Toolbar extends React.Component<{}, {}> {
  public render() {
    return <div className="toolbar">
      {this.props.children}
    </div>;
  }
}
