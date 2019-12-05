import React from "react";
import createReactClass from "create-react-class";

module.exports = createReactClass({
    displayName: "CallTimer",

    // GET INITIAL STATE IS CONSTRUCTOR
    getInitialState: function() {
        return {
            seconds: 0,
            minutes: 0,
            hours: 0,
            timer: null
        };
    },

    componentDidMount() {
        this.startTimer();
    },

    componentWillUnmount() {
        this.startTimer();
    },

    startTimer: function() {
        if (!this.state.timer) {
            this.state.timer = setInterval(() => {
                if (this.state.seconds === 59) {
                    this.setState({
                        seconds: 0,
                        minutes: this.state.minutes + 1
                    });
                    if (this.state.minutes === 60) {
                        this.setState({
                            minutes: 0,
                            hours: this.state.hours + 1
                        });
                        if (this.state.hours === 100) {
                            this.setState({
                                hours: 0
                            });
                        }
                    }
                } else {
                    this.setState({ seconds: this.state.seconds + 1 });
                }
            }, 1000);
        } else {
            clearInterval(this.state.timer);
        }
    },

    stopTimer: function() {
        clearInterval();
    },

    formatSingleDigit(num) {
        return num < 10 ? `0${num}` : num;
    },

    render: function() {
        // Quick buttons should be set depending on state
        // mute-unmute
        // hold-unhold
        // mute-unmute
        //let type = "mute";
        let type = "hold";
        //let type = "transfer";
        let quickButton;
        switch (type) {
            case "mute":
                quickButton = (
                    <div className="quickButton quickButton-mute">
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
                    <div className="quickButton quickButton-hold">
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
                    <div className="quickButton quickButton-transfer">
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
                return;
        }

        //let showButton = true;
        /*let quickButton = showButton ? (
            <div className="quickButton">
                <img
                    src={require("../../../../res/img/blast-mute.png")}
                    width="20"
                    height="20"
                    alt="mute"
                />
            </div>
        ) : null;*/

        // THESE WILL BE USED IN QUICK BUTTONS
        const Unmute = <div className="unmute">Unmute</div>;
        const Unhold = <div className="unhold">Unhold</div>;
        const Untransfer = <div className="untransfer">Untransfer</div>;

        return (
            <div className="in-session">
                <p className="mx_TextualEvent call-timer">
                    {this.formatSingleDigit(this.state.hours)}:
                    {this.formatSingleDigit(this.state.minutes)}:
                    {this.formatSingleDigit(this.state.seconds)}
                    {/*{mute ? <Unmute /> : false} //SHOULD HAVE ON_CLICK FUNCTION
                    {hold ? <Unhold /> : false}
                    {transfer ? <Untransfer /> : false} */}
                    {/*
                    {this.state.hours < 10
                        ? `0${this.state.hours}`
                        : `${this.state.hours}`}
                    :
                    {this.state.minutes < 10
                        ? `0${this.state.minutes}`
                        : `${this.state.minutes}`}
                    :
                    {this.state.seconds < 10
                        ? `0${this.state.seconds}`
                        : `${this.state.seconds}`} */}
                </p>
                {quickButton}
            </div>
        );
    }
});
