import React from "react";
import createReactClass from "create-react-class";
import CallViewStore from "../../stores/CallViewStore";
import MatrixClientPeg from "../../MatrixClientPeg";

module.exports = createReactClass({
    displayName: "CallView",
    getInitialState: function() {
        return {
            room: null,
            roomId: null
        };
    },
    // THIS IS WHERE MEMBERS SHOULD BE RETREIVED FROM
    render: function() {
        const cli = MatrixClientPeg.get();
        // TODO
        // need to pass correct roomId to getRoom
        const room = cli.getRoom(roomId);
        const { member } = CallViewStore._state;
        // THIS WILL SET THE ROOM MEMBERS
        cli.on("RoomState.members", this.onRoomStateMember);

        return (
            <div>
                <div>Should display the other caller's meta data</div>
                <h1>Name: {member}</h1>
                <p>Company: Vinix</p>
            </div>
        );
    }
});
