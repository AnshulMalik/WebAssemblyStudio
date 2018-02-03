import * as React from "react";
import { MouseEvent, WheelEvent } from "react";
import { clamp } from "../index";

export class Tabs extends React.Component<{
  onDoubleClick?: Function;
  commands?: JSX.Element | JSX.Element [];
}, {
    scrollLeft: number;
  }> {
  public refs: {
    container: HTMLDivElement;
  };
  constructor(props: any) {
    super(props);
    this.state = {
      scrollLeft: 0,
    };
  }
  public onWheel = (e: WheelEvent<any>) => {
    const delta = clamp(e.deltaY, -16, 16);
    let { scrollLeft } = this.state;
    scrollLeft += delta;
    // TODO: Work out the details of scrolling.
    scrollLeft = clamp(scrollLeft, 0, this.refs.container.clientWidth);
    this.setState({ scrollLeft });
    e.preventDefault();
  }

  public onDoubleClick = (e: MouseEvent<any>) => {
    return this.props.onDoubleClick && this.props.onDoubleClick();
  }

  public render() {
    return <div className="tabs-container">
      <div ref="container" className="tabs-tab-container" onWheel={this.onWheel} onDoubleClick={this.onDoubleClick}>
        {this.props.children}
      </div>
      <div className="tabs-command-container">
        {this.props.commands}
      </div>
    </div>;
  }
  public componentDidUpdate() {
    this.refs.container.scrollLeft = this.state.scrollLeft;
  }
}

export interface ITabProps {
  label?: string;
  value?: any;
  isActive?: boolean;
  isItalic?: boolean;
  onClick?: Function;
  onDoubleClick?: Function;
  onClose?: Function;
  icon?: string;
  isMarked?: boolean;
}

export class Tab extends React.Component<ITabProps, {}> {
  public render() {
    const { onClick, onDoubleClick, onClose } = this.props;
    let className = "tab";
    if (this.props.isActive) { className += " active"; }
    if (this.props.isMarked) { className += " marked"; }
    if (this.props.isItalic) { className += " italic"; }
    return <div className={className} onClick={(e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      return onClick && onClick(this.props.value);
    }}
    onDoubleClick={(e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      return onDoubleClick && onDoubleClick(this.props.value);
    }}>
      {this.props.icon && <div className="icon"
        style={{
          backgroundImage: `url(svg/${this.props.icon}.svg)`,
        }}></div>
      }
      <div className="label">{this.props.label}</div>
      <div className="close" onClick={(e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        return onClose && onClose(this.props.value);
      }}></div>
    </div>;
  }
}
