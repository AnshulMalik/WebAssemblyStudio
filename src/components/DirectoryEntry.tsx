import * as React from "react";
import { Directory, File, getIconForFileType } from "../model";
import { Menu } from "./Menu";

export class DirectoryEntry extends React.Component<{
  label: string,
  depth: number,
  value: File,
  active: boolean,
  onClick?: Function;
  onDoubleClick?: Function;
  icon: string;
  marked?: boolean;
}, {}> {
  public onClick = () => {
    if (this.props.onClick) {
      this.props.onClick(this.props.value);
    }
  }
  public onDoubleClick = () => {
    if (this.props.onDoubleClick) {
      this.props.onDoubleClick(this.props.value);
    }
  }
  public render() {
    let className = "directory-entry";
    if (this.props.active) {
      className += " active";
    }
    if (this.props.marked) {
      className += " marked";
    }
    return <div className={className} onClick={this.onClick} onDoubleClick={this.onDoubleClick}>
      <div style={{ width: `calc(${this.props.depth}rem - 2px)` }}></div>
      <div className="icon" style={{
        backgroundImage: `url(svg/${this.props.icon}.svg)`,
      }}></div>
      <div className="label">{this.props.label}</div>
      <div className="close"></div>
    </div>;
  }
}

export interface IDirectoryTreeProps {
  directory: Directory;
  value?: File;
  onClickFile: (file: File) => void;
  onDoubleClickFile: (file: File) => void;
  makeMenuItems?: (file: File) => JSX.Element[];
}

export class DirectoryTree extends React.Component<IDirectoryTreeProps, {
}> {
  constructor(props: IDirectoryTreeProps) {
    super(props);
  }

  public makeDirectoryEntries(directory: Directory): DirectoryEntry[] {
    const self = this;
    const entries: any[] = [];
    const { makeMenuItems, onClickFile, onDoubleClickFile } = this.props;
    function go(directory: Directory, depth: number) {
      directory.forEachFile((file) => {
        let icon = getIconForFileType(file.type);
        if (file instanceof Directory && file.isOpen) {
          icon = "default_folder_opened";
        }
        entries.push(
          <Menu key={file.key} items={
            makeMenuItems ? makeMenuItems(file) : null
          }><DirectoryEntry
              icon={icon}
              marked={file.isDirty}
              label={file.name} depth={depth} value={file} onClick={() => {
                if (file instanceof Directory) {
                  file.isOpen = !file.isOpen;
                  self.forceUpdate();
                } else if (self.props.onClickFile) {
                  onClickFile(file);
                }
              }}
              onDoubleClick={() => {
                if (onDoubleClickFile) {
                  onDoubleClickFile(file);
                }
              }}
              active={self.props.value === file} /></Menu>);
        if (file instanceof Directory && file.isOpen) {
          go(file, depth + 1);
        }
      });
    }
    go(directory, 1);
    return entries;
  }
  public render() {
    return <div>{this.makeDirectoryEntries(this.props.directory)}</div>;
  }
}
