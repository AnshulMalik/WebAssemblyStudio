import * as React from "react";
import { MouseEvent } from "react";

export class MenuItem extends React.Component<{
  label: string;
  onClick: Function;
  icon?: JSX.Element;
}, {}> {
  public render() {
    return <div className="menu-entry" onClick={this.props.onClick as any}>
      <div className="icon">{this.props.icon}</div>
      <div className="label">{this.props.label}</div>
    </div>;
  }
}

function inFirefox() {
  return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
}

export class Menu extends React.Component<{
  items: JSX.Element [];
  activateOnLeftClick?: boolean;
}, {
    x: number;
    y: number;
    visible: boolean;
  }> {
  public static active: Menu = null;
  public static ignoreNextWindowClickEvent = false;
  public static closeActive() {
    if (Menu.active) {
      Menu.active.hide();
      Menu.active = null;
    }
  }
  constructor(props: any) {
    super(props);
    this.state = { x: 0, y: 0, visible: false };
  }
  public hide() {
    this.setState({ visible: false });
  }
  public onClick(e: MouseEvent<any>) {
    if (this.props.activateOnLeftClick && Menu.active === this) {
      return;
    }
    if (this.props.activateOnLeftClick) {
      this.onContextMenu(e);
      Menu.ignoreNextWindowClickEvent = true;
    }
  }
  public onContextMenu(e: MouseEvent<any>) {
    Menu.closeActive();
    Menu.active = this;
    const offset = 4;
    const popupMenuWidth = 256;
    const onRight = e.clientX + offset + popupMenuWidth < window.innerWidth;
    let x = 0;
    let y = 0;

    if (onRight) {
      x = e.clientX + offset;
    } else {
      x = e.clientX - offset - popupMenuWidth;
    }
    y = e.clientY + offset;
    this.setState({ x, y, visible: true });
    e.preventDefault();
    if (inFirefox()) {
      Menu.ignoreNextWindowClickEvent = true;
    }
  }
  // menu: HTMLDivElement;
  // setMenu(menu: HTMLDivElement) {
  //   this.menu = menu;
  // }
  public render() {
    return <div className="menu" onClick={this.onClick.bind(this)} onContextMenu={this.onContextMenu.bind(this)}>
      {this.state.visible && <div style={{ left: this.state.x, top: this.state.y }} className="menu popup">
        {this.props.items}
      </div>}
      {this.props.children}
    </div>;
  }
}

window.addEventListener("click", (e: any) => {
  if (Menu.ignoreNextWindowClickEvent) {
    Menu.ignoreNextWindowClickEvent = false;
    return;
  }
  // console.log("window click");
  Menu.closeActive();
});
