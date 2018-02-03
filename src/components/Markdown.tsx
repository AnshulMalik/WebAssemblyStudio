import * as React from "react";
import { Service } from "../service";

export interface IMarkdownProps {
  src: string;
}

export class Markdown extends React.Component<IMarkdownProps, {
  html: string,
}> {
  constructor(props: any) {
    super(props);
    this.state = {
      html: "Loading ...",
    };
  }
  public componentDidMount() {
    Service.compileMarkdownToHtml(this.props.src).then((html) => {
      this.setState({html});
    });
  }
  public componentWillReceiveProps(props: IMarkdownProps) {
    if (this.props.src !== props.src) {
      Service.compileMarkdownToHtml(props.src).then((html) => {
        this.setState({html});
      });
    }
  }
  public render() {
    return (
      <div
        style={{padding: "8px"}}
        className="md"
        dangerouslySetInnerHTML={{__html: this.state.html}} />
    );
  }
}
