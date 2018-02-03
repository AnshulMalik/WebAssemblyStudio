import "monaco-editor";
import * as React from "react";
import { File, languageForFileType, Project } from "../model";
import { View } from "./EditorPane";

declare var window: any;

// Lifecycle
// https://cdn-images-1.medium.com/max/1600/0*VoYsN6eq7I_wjVV5.png

export interface IMonacoProps {
  view: View;
  options?: monaco.editor.IEditorConstructionOptions;
}

export class Monaco extends React.Component<IMonacoProps, {}> {
  public editor: monaco.editor.IStandaloneCodeEditor;
  public container: HTMLDivElement;

  public revealLastLine() {
    this.editor.revealLine(this.editor.getModel().getLineCount());
  }

  public componentDidMount() {
    const { view } = this.props;
    if (view) {
      this.ensureEditor();
      this.editor.setModel(view.file.buffer);

      // TODO: Weird that we need this to make monaco really think it needs to update the language.
      monaco.editor.setModelLanguage(this.editor.getModel(), languageForFileType(view.file.type));

      this.editor.restoreViewState(view.state);
      this.editor.updateOptions({ readOnly: view.file.isBufferReadOnly });
    }
    document.addEventListener("layout", this.layout);
  }

  public componentWillReceiveProps(nextProps: IEditorProps) {
    if (this.props.view !== nextProps.view) {
      // We're about to switch to a new file, save the view state.
      this.props.view.state = this.editor.saveViewState();
    }
  }

  public shouldComponentUpdate(nextProps: IEditorProps, nextState: any) {
    if (this.props.view === nextProps.view) {
      return false;
    }
    return true;
  }

  public componentDidUpdate() {
    const { view } = this.props;
    if (view) {
      this.ensureEditor();
      this.editor.setModel(view.file.buffer);
      this.editor.restoreViewState(view.state);
      this.editor.updateOptions({ readOnly: view.file.isBufferReadOnly });
    }
  }

  public timeout = 0;
  public layout = () => {
    if (this.timeout) {
      window.clearTimeout(this.timeout);
    }
    this.timeout = window.setTimeout(() => {
      this.timeout = 0;
      this.editor.layout();
    }, 10);
  }

  public componentWillUnmount() {
    document.removeEventListener("layout", this.layout);
    // We're about to close the editor, save the view state.
    this.props.view.state = this.editor.saveViewState();
  }

  public registerActions() {
    const self = this;
    this.editor.addAction({
      id: "save",
      label: "Save",
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
      ],
      precondition: null,
      keybindingContext: null,
      run() {
        const view = self.props.view;
        if (view && !view.file.isBufferReadOnly) {
          view.file.save();
        }
        return null;
      },
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_B, function() {
      Project.build();
    },  null);

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
      Project.run();
    },  null);

  }
  private ensureEditor() {
    if (this.editor) { return; }
    const options = Object.assign({
      value: "",
      theme: "fiddle-theme",
      minimap: {
        enabled: false,
      },
      fontWeight: "bold",
      renderLineHighlight: "none",
    }, this.props.options);
    if (this.container.lastChild) {
      this.container.removeChild(this.container.lastChild);
    }
    this.editor = monaco.editor.create(this.container, options as any);
    this.registerActions();
    console.info("Created a new Monaco editor.");
  }
  private setContainer(container: HTMLDivElement) {
    if (container == null) { return; }
    if (this.container !== container) {
      // ...
    }
    this.container = container;
  }
  public render() {
    return <div className="fill" ref={(ref) => this.setContainer(ref)}></div>;
  }
}

export interface IEditorProps {
  view: View;
  options?: monaco.editor.IEditorConstructionOptions;
}

export class Editor extends React.Component<IEditorProps, {}> {
  public monaco: Monaco;
  public setMonaco(monaco: Monaco) {
    this.monaco = monaco;
  }
  public revealLastLine() {
    this.monaco.revealLastLine();
  }
  public render() {
    const file = this.props.view.file;
    if (file.description) {
      return <div className="fill">
        <div className="editor-status-bar">
          <div className="status-bar-item">{file.description}</div>
        </div>
        <div className="editor-container">
          <Monaco ref={(ref) => this.setMonaco(ref)} view={this.props.view} options={this.props.options} />
        </div>;
      </div>;
    } else {
      return <div className="fill">
        <Monaco ref={(ref) => this.setMonaco(ref)} view={this.props.view} options={this.props.options} />
      </div>;
    }
  }
}
