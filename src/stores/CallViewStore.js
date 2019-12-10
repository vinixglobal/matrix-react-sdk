import dis from "../dispatcher";
import { Store } from "flux/utils";
// CONNECTION TO matrix-js-sdk
import MatrixClientPeg from "../MatrixClientPeg";
import sdk from "../index";
import Modal from "../Modal";
import { _t } from "../languageHandler";
import { getCachedRoomIDForAlias } from "../RoomAliasCache";

const INITIAL_STATE = {
    roomId: null,
    roomAlias: null,
    member: null
};

class CallViewStore extends Store {
    constructor() {
        super(dis);
        this._state = INITIAL_STATE;
    }

    _setState(newState) {
        this._state = Object.assign({}, this._state, newState);
        this.__emitChange();
    }

    async __onDispatch(payload) {
        //console.log("NEED TO GET OTHER MEMBER OF ROOM", payload.room);
        //console.log("Payload.action", payload.action);
        switch (payload.action) {
            case "call_view":
                const { accessToken } = MatrixClientPeg._currentClientCreds;
                //console.log("====================");
                //console.log("payload", payload);
                /*console.log(
                    "WHAT DATA CAN I PASS TO CALL VIEW ACTION: =>",
                    payload
                );*/
                //console.log("====================");
                this._callView(payload);
                break;
            case "MatrixActions.Room": // BAD DESIGN - calls a search on entire list of user's room
                //console.log("Matrix Action.Room ++++++++++++");
                //console.log("SETTING MEMBER FROM GET ROOM", payload.room);
                //const members = await payload.room.currentState.members;
                //const me = payload.room.myUserId;
                //let otherMember;
                //if (!(me in members)) {
                //otherMember = Object.keys(members)[0];
                //console.log("OTHER MEMBER IS THIS!!!!", otherMember);
                //this._setState({ member: "NOT ME" });
                //}
                //console.log("MEMBERS ARE : ==> ", await members);
                //console.log("I AM ==> ", me);
                //const member = members.filter(user => user !== me);
                //console.log("OTHER MEMBER IS", member);
                //console.log("++++++++++++");
                break;
        }
    }

    async _callView(payload) {
        // console.log("WHAT IS IN PAYLOAD?", payload);
        // IF PAYLOAD
        console.log("PAYLOAD INSIDE OF _CALL VIEW", payload);
        if (payload.room_id) {
            const newState = {
                roomId: payload.room_id,
                // DO I WANT THE OTHER MEMBER IN HERE?
                roomAlias: payload.room_alias,
                initialEventId: payload.event_id,
                isInitialEventHighlighted: payload.highlighted,
                forwardingEvent: null,
                roomLoading: false,
                // WHAT DOES PEEK DO? does this by default
                shouldPeek:
                    payload.should_peek === undefined
                        ? true
                        : payload.should_peek,
                joining: payload.joining || false,
                // REPLYING TO EVENT NOT NEEDED FOR CALL
                //replyingToEvent: null,
                isEditingSettings: false
            };
            this._setState(newState);
        } else if (payload.room_alias) {
            // ROOM ALIAS
            // CHECK IN CACHE
            let roomId = getCachedRoomIDForAlias(payload.room_alias);
            // CHECK IN HOMESERVER
            if (!roomId) {
                this._setState({
                    roomId: null,
                    roomAlias: payload.room_alias
                });
            }
            // DISPATCH FROM ALIAS CHECK
            dis.dispatch({
                action: "view_room",
                room_id: roomId
            });
        }
    }

    reset() {
        this._state = Object.assign({}, INITIAL_STATE);
    }

    //_viewRoomError(payload) // SHOULD THIS BE ADDED?
}

let singletonCallViewStore = null;

if (!singletonCallViewStore) {
    singletonCallViewStore = new CallViewStore();
}

module.exports = singletonCallViewStore;
