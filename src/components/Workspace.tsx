import * as React from "react";

import { Header } from "./Header";
import { DirectoryTree } from "./DirectoryTree";
import { Project, File, Directory } from "../model";
import { SplitOrientation, SplitInfo, Split } from "./Split";

export interface WorkspaceProps {
  /**
   * Active file.
   */
  file: File;
  project: Project;
  onEditFile?: (file: File) => void;
  onDeleteFile?: (file: File) => void;
  onRenameFile?: (file: File) => void;
  onNewFile?: (directory: Directory) => void;
  onNewDirectory?: (directory: Directory) => void;
  onClickFile: (file: File) => void;
  onDoubleClickFile?: (file: File) => void;
}

export class Workspace extends React.Component<WorkspaceProps, {
  showProject: boolean;
  showFiles: boolean;
  splits: SplitInfo[];
}> {
  constructor(props: any) {
    super(props);
    this.state = {
      showProject: false,
      showFiles: true,
      splits: []
    };
  }
  public render() {
    const project = this.props.project;
    return <div className="workspaceContainer">
      <Header />
      <div style={{ height: "calc(100% - 41px)" }}>
        <Split name="Workspace" orientation={SplitOrientation.Horizontal} splits={this.state.splits} onChange={(splits) => {
          this.setState({ splits });
        }}>
          <div></div>
          <DirectoryTree directory={project} value={this.props.file}
            onNewFile={this.props.onNewFile}
            onNewDirectory={this.props.onNewDirectory}
            onEditFile={this.props.onEditFile}
            onDeleteFile={this.props.onDeleteFile}
            onClickFile={(file: File) => {
              this.props.onClickFile(file);
            }}
            onDoubleClickFile={(file: File) => {
              this.props.onDoubleClickFile(file);
            }} />
        </Split>
      </div>
    </div>;
  }
}
