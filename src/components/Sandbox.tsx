import * as React from "react";
import { Logger, mimeTypeForFileType, Project } from "../model";
import { Split } from "./Split";

interface SandboxWindow extends Window {
  /**
   * Creates an object URL to a Blob containing the file's data.
   */
  getFileURL(path: string): string;
}

export class Sandbox extends React.Component<{
  logger: Logger,
}, {}> {
  public container: HTMLDivElement;
  private setContainer(container: HTMLDivElement) {
    if (container == null) { return; }
    if (this.container !== container) {
      // ...
    }
    this.container = container;
  }
  public onResizeBegin = () => {
    this.container.style.pointerEvents = "none";
  }
  public onResizeEnd = () => {
    this.container.style.pointerEvents = "auto";
  }
  public componentDidMount() {
    Split.onResizeBegin.register(this.onResizeBegin);
    Split.onResizeEnd.register(this.onResizeEnd);
  }
  public componentWillUnmount() {
    Split.onResizeBegin.unregister(this.onResizeBegin);
    Split.onResizeEnd.unregister(this.onResizeEnd);
  }
  public run(project: Project, src: string) {
    const iframe = document.createElement("iframe");
    iframe.className = "sandbox";
    iframe.src = URL.createObjectURL(new Blob([src], { type: "text/html" }));
    if (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(iframe);
    const contentWindow = iframe.contentWindow as SandboxWindow;
    const logger = this.props.logger;
    // Hijack Console
    const log = contentWindow.console.log;
    contentWindow.console.log = function(message: any) {
      logger.logLn(message);
      log.apply(contentWindow.console, arguments);
    };
    contentWindow.getFileURL = (path: string) => {
      const file = project.getFile(path);
      if (!file) {
        this.props.logger.logLn(`Cannot find file ${path}`, "error");
        return;
      }
      const blob = new Blob([file.getData()], { type: mimeTypeForFileType(file.type) });
      return window.URL.createObjectURL(blob);
    };
    const ready = new Promise((resolve: (window: Window) => any) => {
      (iframe as any).onready = () => {
        resolve(contentWindow);
      };
    });
  }
  public render() {
    return <div className="fill" ref={(ref) => this.setContainer(ref)}>
    </div>;
  }
}
