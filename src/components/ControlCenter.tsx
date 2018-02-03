import * as React from "react";
import { FileType, getIconForFileType, Problem } from "../model";
import { Directory, File, Project } from "../model";
import { Button } from "./Button";
import { Editor } from "./Editor";
import { View } from "./EditorPane";
import { GoThreeBars } from "./Icons";
import { Sandbox } from "./Sandbox";
import { ISplitInfo, Split, SplitOrientation } from "./Split";
import { Tab, Tabs } from "./Tabs";

export class TreeViewItem extends React.Component<{
  label: string;
  icon: string;
  depth?: number;
}, {
  }> {
  public render() {
    return <div className="tree-view-item">
      <div style={{ width: `calc(${this.props.depth}rem - 2px)` }}></div>
      <div className="icon" style={{
        backgroundImage: `url(svg/${this.props.icon}.svg)`,
      }} />
      <div className="label">{this.props.label}</div>
    </div>;
  }
}

export class TreeViewProblemItem extends React.Component<{
  problem: Problem;
  depth?: number;
}, {
  }> {
  public render() {
    const problem = this.props.problem;
    const marker = problem.marker;
    const position = `(${marker.startLineNumber}, ${marker.startColumn})`;
    return <div className="tree-view-item">
      <div style={{ width: `calc(${this.props.depth}rem - 2px)` }}></div>
      <div className="icon" style={{
        backgroundImage: `url(svg/${problem.severity + "-dark"}.svg)`,
      }} />
      <div className="label">{marker.message} <span className="problem-position">{position}</span></div>
    </div>;
  }
}

export class TreeView extends React.Component<{

}, {
  }> {
  public render() {
    return <div className="tree-view">
      {this.props.children}
    </div>;
  }
}

export class Problems extends React.Component<{
  project: Project;
}, {
  }> {
  public componentDidMount() {
    // TODO: Unregister.
    this.props.project.onDidChangeProblems.register(() => {
      this.forceUpdate();
    });
  }
  public render() {
    const treeViewItems: any = [];
    function go(directory: Directory) {
      directory.forEachFile((file) => {
        if (file instanceof Directory) {
          go(file);
        } else {
          // let depth = file.getDepth();
          if (file.problems.length) {
            treeViewItems.push(<TreeViewItem depth={0} icon={getIconForFileType(file.type)} label={file.name}></TreeViewItem>);
            file.problems.forEach((problem) => {
              treeViewItems.push(<TreeViewProblemItem depth={1} problem={problem} />);
            });
          }
        }
      });
    }
    go(this.props.project);
    return <TreeView>
      {treeViewItems}
    </TreeView>;
  }
}

export class ControlCenter extends React.Component<{
  project: Project;
}, {
    /**
     * Split state.
     */
    splits: ISplitInfo[];

    /**
     * Visible pane.
     */
    visible: "output" | "problems";
  }> {
  constructor(props: any) {
    super(props);
    this.state = {
      visible: "problems",
      splits: [
        { min: 128, value: 512 },
        { min: 128, value: 256 },
      ],
    };
    this.outputView = new View(new File("output", FileType.Log), null);
  }
  public sandbox: Sandbox;
  public outputView: View;
  public refs: {
    container: HTMLDivElement;
  };
  public outputViewEditor: Editor;
  public setOutputViewEditor(editor: Editor) {
    this.outputViewEditor = editor;
  }
  public setSandbox(sandbox: Sandbox) {
    this.sandbox = sandbox;
  }
  public logLnTimeout: any;
  public logLn(message: string, kind: "" | "info" | "warn" | "error" = "") {
    if (!this.outputViewEditor) {
      return;
    }
    message = message + "\n";
    if (kind) {
      message = "[" + kind + "]: " + message;
    }
    const model = this.outputView.file.buffer;
    const lineCount = model.getLineCount();
    const lastLineLength = model.getLineMaxColumn(lineCount);
    const range = new monaco.Range(lineCount, lastLineLength, lineCount, lastLineLength);
    model.applyEdits([
      { forceMoveMarkers: true, identifier: null, range, text: message },
    ]);
    this.outputViewEditor.revealLastLine();
    if (!this.logLnTimeout) {
      this.logLnTimeout = window.setTimeout(() => {
        this.forceUpdate();
        this.logLnTimeout = null;
      });
    }
  }
  public createPane() {
    switch (this.state.visible) {
      case "output":
        return <Editor ref={(ref) => this.setOutputViewEditor(ref)} view={this.outputView}></Editor>;
      case "problems":
        return <Problems project={this.props.project} />;
      default:
        return null;
    }
  }
  public render() {
    return <div className="fill">
      <div style={{ display: "flex" }}>
        <div>
          <Button icon={<GoThreeBars />} title="View Console" onClick={() => {
            // TODO: Figure out how the UX should work when toggling the console.
            // let consoleSplits = this.state.consoleSplits;
            // let second = consoleSplits[1];
            // second.value = second.value == 40 ? 128 : 40;
            // this.setState({ consoleSplits });
            // layout();
          }} />
        </div>
        <div>
          <Tabs>
            <Tab label={`Output (${this.outputView.file.buffer.getLineCount()})`} onClick={() => {
              this.setState({ visible: "output" });
            }}></Tab>
            <Tab label="Problems" onClick={() => {
              this.setState({ visible: "problems" });
            }}></Tab>
          </Tabs>
        </div>
      </div>
      <div style={{ height: "calc(100% - 40px)" }}>
        <Split name="editor/sandbox" orientation={SplitOrientation.Vertical} defaultSplit={{
          min: 256,
        }}
          splits={this.state.splits} onChange={(splits) => {
            this.setState({ splits });
            // layout();
          }}>
          {this.createPane()}
          <Sandbox ref={(ref) => this.setSandbox(ref)} logger={this} />
        </Split>
      </div>
    </div>;
  }
}
