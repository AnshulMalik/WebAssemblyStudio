import * as React from "react";
import { ChangeEventHandler } from "react";

export class Spacer extends React.Component<{
  height: number,
}, {}> {
  public render() {
    return <div style={{ height: this.props.height }} />;
  }
}

export class Divider extends React.Component<{
  height: number,
}, {}> {
  public render() {
    return <div className="divider" style={{
      marginTop: this.props.height / 2,
      marginBottom: this.props.height / 2,
    }} />;
  }
}

export class TextInputBox extends React.Component<{
  label: string;
  value: string;
  error?: string;
  onChange?: ChangeEventHandler<any>;
}, {

  }> {
  constructor(props: any) {
    super(props);
  }
  public render() {
    const input = <input
                    className="text-input-box"
                    type="text"
                    value={this.props.value}
                    onChange={this.props.onChange}
                  />;
    if (this.props.label) {
      return <div style={{ display: "flex", flexDirection: "row" }}>
        <div className="text-input-box-label">{this.props.label}</div>
        <div style={{ flex: 1 }}>{input}</div>
        {this.props.error && <div className="text-input-box-error">{this.props.error}</div>}
      </div>;
    } else {
      return input;
    }
  }
}

export class ListItem extends React.Component<{
  label: string;
  onClick?: Function;
  icon?: JSX.Element;
  selected?: boolean;
  value: any;
}, {

  }> {

  public render() {
    let className = "list-item";
    if (this.props.selected) {
      className += " selected";
    }
    return <div className={className} onClick={this.props.onClick as any}>
      <div className="icon">{this.props.icon}</div>
      <div className="label">{this.props.label}</div>
    </div>;
  }
}

export class ListBox extends React.Component<{
  height: number;
  value: any;
  onSelect?: (value: any) => void;
}, {

  }> {
  constructor(props: any) {
    super(props);
  }

  public render() {
    const { children, onSelect } = this.props;

    const newChildren = React.Children.map(children, (child: any, index) => {
      return React.cloneElement(child as any, {
        onClick: () => {
          return onSelect && onSelect(child.props.value);
        },
        selected: this.props.value === child.props.value,
      });
    });

    return <div className="list-box" style={{
      height: this.props.height,
    }}>
      {newChildren}
    </div>;
  }
}
