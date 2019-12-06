import React from "react";
import createReactClass from "create-react-class";
import classNames from "classnames";

module.exports = createReactClass({
    displayName: "CallTimer",
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
        this.stopTimer();
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
        }
    },

    stopTimer: function() {
        clearInterval(this.state.timer);
    },

    formatSingleDigit(num) {
        return num < 10 ? `0${num}` : num;
    },

    render: function() {
        const classes = classNames({
            "in-session": true
        });

        return (
            <div className={classes}>
                <p className="mx_TextualEvent call-timer">
                    {this.formatSingleDigit(this.state.hours)}:
                    {this.formatSingleDigit(this.state.minutes)}:
                    {this.formatSingleDigit(this.state.seconds)}
                </p>
            </div>
        );
    }
});
