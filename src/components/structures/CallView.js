import React from "react";
import createReactClass from "create-react-class";

module.exports = createReactClass({
    displayName: "CallView",
    getInitialState: function() {
        return {
            room: null,
            roomId: null
        };
    },
    render: function() {
        // Data needs to be passed into here
        return (
            <div>
                <div>Should display the other user's meta data</div>
            </div>
        );
    }
});
