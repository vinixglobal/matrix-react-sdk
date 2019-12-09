import React from "react";
import createReactClass from "create-react-class";
import classNames from "classnames";

module.exports = createReactClass({
    getInitialState: function() {
        return {
            mute: false,
            hold: false,
            transfer: false,
            dialpad: false
        };
    },
    render: function() {
        // PROPS WILL PASS INTO TYPE TO DETERMINE STYLING AND FUNCTIONALITY
        // console.log("WHAT IS THIS CALL_TIMER: PROPS?", this.props);
        // console.log("WHAT IS THIS CALL_TIMER: STATE?", this.state);
        let type = this.props.type;
        // let type = "mute";
        let quickButton;

        switch (type) {
            case "mute":
                quickButton = (
                    <div className="quick_button quick_button_mute">
                        <img
                            src={require("../../../../res/img/blast-mute.png")}
                            width="20"
                            height="20"
                            alt="mute"
                        />
                    </div>
                );
                break;
            case "hold":
                quickButton = (
                    <div className="quick_button quick_button_hold">
                        <img
                            src={require("../../../../res/img/blast-hold.png")}
                            width="20"
                            height="20"
                            alt="hold"
                        />
                    </div>
                );
                break;
            case "transfer":
                quickButton = (
                    <div className="quick_button quick_button_transfer">
                        <img
                            src={require("../../../../res/img/blast-transfer.png")}
                            width="20"
                            height="20"
                            alt="transfer"
                        />
                    </div>
                );
                break;
            default:
                return <React.Fragment />;
        }
        const classes = classNames({
            "in-session": true
        });
        return quickButton;
    }
});
