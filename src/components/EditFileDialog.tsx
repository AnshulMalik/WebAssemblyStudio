import * as React from "react";
import { ChangeEvent } from "react";
import * as ReactModal from "react-modal";
import { Directory, File } from "../model";
import { Button } from "./Button";
import { GoPencil, GoX } from "./Icons";
import { Spacer, TextInputBox } from "./Widgets";

export interface FileDialogProps {
  isOpen: boolean;
  file: File;
  onChange: (name: string, description: string) => void;
  onCancel: () => void;
}
export class EditFileDialog extends React.Component<FileDialogProps, {
    description: string;
    name: string;
  }> {
  constructor(props: FileDialogProps) {
    super(props);
    this.state = {
      description: props.file.description,
      name: props.file.name,
    };
  }
  public onChangeName = (event: ChangeEvent<any>) => {
    this.setState({ name: event.target.value });
  }
  public onChangeDescription = (event: ChangeEvent<any>) => {
    this.setState({ description: event.target.value });
  }
  public error() {
    const directory = this.props.file.parent;
    const file = directory.getImmediateChild(this.state.name);
    if (file && file !== this.props.file) {
      return `A file with the same name already exists.`;
    }
    return "";
  }
  public render() {
    const file = this.props.file;
    return <ReactModal
      isOpen={this.props.isOpen}
      contentLabel={"Edit " + (file instanceof Directory ? "Directory" : "File")}
      className="modal"
      overlayClassName="overlay"
      ariaHideApp={false}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="modal-title-bar">
          {`Edit ${file instanceof Directory ? "Directory" : "File"} ${file.name}`}
        </div>
        <div style={{ flex: 1, padding: "8px" }}>
          <TextInputBox label="Name:" error={this.error()} value={this.state.name} onChange={this.onChangeName}/>
          <Spacer height={8}/>
          <TextInputBox label="Description:" error={this.error()} value={this.state.description} onChange={this.onChangeDescription}/>
        </div>
        <div>
          <Button icon={<GoX />} label="Cancel" title="Cancel" onClick={() => {
            this.props.onCancel();
          }} />
          <Button icon={<GoPencil />} label="Edit" title="Edit" isDisabled={!this.state.name || !!this.error()} onClick={() => {
            return this.props.onChange && this.props.onChange(this.state.name, this.state.description);
          }} />
        </div>
      </div>
    </ReactModal>;
  }
}
