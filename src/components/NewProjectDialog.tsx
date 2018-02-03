import * as React from "react";
import { ChangeEvent } from "react";
import * as ReactModal from "react-modal";
import { Service } from "../service";
import { Button } from "./Button";
import { GoFile, GoX, Icon } from "./Icons";
import { ListBox, ListItem } from "./Widgets";

export interface ITemplate {
  name: string;
  description: string;
  project: any;
  icon: string;
}

export class NewProjectDialog extends React.Component<{
  isOpen: boolean;
  onCreate: (template: ITemplate) => void;
  onCancel: () => void;
}, {
    description: string;
    name: string;
    template: ITemplate;
    templates: ITemplate [];
  }> {
  constructor(props: any) {
    super(props);
    this.state = {
      template: null,
      description: "",
      name: "",
      templates: [],
    };
  }
  public onChangeName = (event: ChangeEvent<any>) => {
    this.setState({ name: event.target.value });
  }
  public nameError() {
    // let directory = this.props.directory;
    // if (this.state.name) {
    //   if (!/^[a-z0-9\.\-\_]+$/i.test(this.state.name)) {
    //     return "Illegal characters in file name.";
    //   } else if (!this.state.name.endsWith(extensionForFileType(this.state.fileType))) {
    //     return nameForFileType(this.state.fileType) + " file extension is missing.";
    //   } else if (directory && directory.getImmediateChild(this.state.name)) {
    //     return `File '${this.state.name}' already exists.`;
    //   }
    // }
    // return "";
  }
  // fileName() {
  //   let name = this.state.name;
  //   let extension = extensionForFileType(this.state.template);
  //   if (!name.endsWith("." + extension)) {
  //     name += "." + extension;
  //   }
  //   return name;
  // }
  public createButtonLabel() {
    return "Create";
  }
  public componentDidMount() {
    fetch("templates/templates.js").then((response) => {
      response.text().then((js) => {
        const templates = eval(js);
        this.setState({templates});
        this.setTemplate(templates[0]);
      });
    });
  }
  public setTemplate(template: ITemplate) {
    this.setState({ template });
    Service.compileMarkdownToHtml(template.description).then((description) => {
      this.setState({description});
    });
  }
  public render() {
    return <ReactModal
      isOpen={this.props.isOpen}
      contentLabel="Create New Project"
      className="modal"
      overlayClassName="overlay"
      ariaHideApp={false}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="modal-title-bar">
          Create New Project
        </div>
        <div>
          <div style={{ display: "flex" }}>
            <div style={{ width: 200 }}>
              <ListBox value={this.state.template} height={240} onSelect={(template) => {
                this.setTemplate(template);
              }}>
              {
                this.state.templates.map((template) => {
                  return <ListItem value={template} label={template.name} icon={<Icon src={template.icon} />} />;
                })
              }
              </ListBox>
            </div>
            <div style={{ flex: 1 }} className="new-project-dialog-description">
              <div className="md" dangerouslySetInnerHTML={{__html: this.state.description}}></div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "8px" }}>
          {/* <TextInputBox
            label={"Name: " + (this.props.directory ? this.props.directory.getPath() + "/": "")}
            error={this.nameError()}
            value={this.state.name}
            onChange={this.onChangeName}/> */}
        </div>
        <div>
          <Button icon={<GoX />} label="Cancel" title="Cancel" onClick={() => {
            this.props.onCancel();
          }} />
          <Button
            icon={<GoFile />}
            label={this.createButtonLabel()}
            title="Cancel"
            isDisabled={!this.state.template}
            onClick={() => {
              // let file = new File(this.fileName(), this.state.template);
              return this.props.onCreate && this.props.onCreate(this.state.template);
            }} />
        </div>
      </div>
    </ReactModal>;
  }
}
