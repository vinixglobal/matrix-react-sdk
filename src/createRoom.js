/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import MatrixClientPeg from "./MatrixClientPeg";
import Modal from "./Modal";
import sdk from "./index";
import { _t } from "./languageHandler";
import dis from "./dispatcher";
import * as Rooms from "./Rooms";
import Promise from "bluebird";
import { getAddressType } from "./UserAddress";

/**
 * Create a new room, and switch to it.
 *
 * @param {object=} opts parameters for creating the room
 * @param {string=} opts.dmUserId If specified, make this a DM room for this user and invite them
 * @param {object=} opts.createOpts set of options to pass to createRoom call.
 * @param {bool=} opts.spinner True to show a modal spinner while the room is created.
 *     Default: True
 *
 * @returns {Promise} which resolves to the room id, or null if the
 * action was aborted or failed.
 */
function createRoom(opts, phone = false) {
    // console.log("THIS IS THE ARGUMENT PASSED TO CREATE ROOM", opts); // dmUserId: ${1234512345}
    opts = opts || {};
    if (opts.spinner === undefined) opts.spinner = true;

    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
    const Loader = sdk.getComponent("elements.Spinner");

    const client = MatrixClientPeg.get();
    const domain = client.baseUrl.split("/").pop();
    // console.log("WHAT IS DOMAIN?", domain);
    if (client.isGuest()) {
        dis.dispatch({ action: "require_registration" });
        return Promise.resolve(null);
    }

    const defaultPreset = opts.dmUserId
        ? "trusted_private_chat"
        : "private_chat";

    // set some defaults for the creation
    const createOpts = opts.createOpts || {};
    createOpts.preset = createOpts.preset || defaultPreset;
    createOpts.visibility = createOpts.visibility || "private";

    if (opts.dmUserId && createOpts.invite === undefined) {
        //const phoneCheck = /^\d{10}$/;
        // IF PHONE
        //if (phoneCheck.test(opts.dmUserId)) {
        //opts.dmUserId = `@sip_${opts.dmUserId}:${domain}`;
        //}
        //console.log("OPTS DM USER ID ==============>", opts.dmUserId);
        //console.log("Create Opts Visibility =======>", createOpts.invite);
        //getAddressType(1234512345);
        switch (getAddressType(opts.dmUserId)) {
            case "mx-user-id":
                createOpts.invite = [opts.dmUserId];
                break;
            //case "phone":
            //console.log("OK PHONE IS ==============>", [opts.dmUserid]);
            //createOpts.invite = [opts.dmUserId];
            //break;
            case "email":
                createOpts.invite_3pid = [
                    {
                        id_server: MatrixClientPeg.get().getIdentityServerUrl(
                            true
                        ),
                        medium: "email",
                        address: opts.dmUserId
                    }
                ];
                break;
            case "phone":
                //console.log( //preset: 'trusted_private_chat', visibility: 'private'
                //"WHAT OPTIONS ARE PASSED TO THE CREATE OPTS KEY",
                //createOpts
                //);
                console.log("/******* 2nd ***********/");
                opts.dmUserId = `@sip_${opts.dmUserId}:${domain}`;
                // CREATE OPTS INVITE NEEDED else EMPTY ROOM IS CREATED
                createOpts.invite = [opts.dmUserId];
                break;
        }
    } // END OF INVITE

    if (opts.dmUserId && createOpts.is_direct === undefined) {
        createOpts.is_direct = true; // DEFAULT IS TRUE
        //createOpts.is_direct = false; // DOESN'T MATTER
        //console.log("THIS WILL ALWAYS SET THE KEY IS_DIRECT TO TRUE ALWAYS");
        //console.log("SHOULD THIS BE DIFFERENT", createOpts);
    }

    // By default, view the room after creating it
    if (opts.andView === undefined) {
        opts.andView = true;
    }

    // Allow guests by default since the room is private and they'd
    // need an invite. This means clicking on a 3pid invite email can
    // actually drop you right in to a chat.
    createOpts.initial_state = createOpts.initial_state || [
        {
            content: {
                guest_access: "can_join"
            },
            type: "m.room.guest_access",
            state_key: ""
        }
    ];

    let modal;
    if (opts.spinner)
        modal = Modal.createDialog(Loader, null, "mx_Dialog_spinner");

    let roomId;
    // IS THIS WHERE TAGS ARE SET?
    console.log(
        "<<<<<<<<<<<<<< CREATE OPTS IS THE DATA USED TO CREATE ROOM",
        createOpts
    );
    return client
        .createRoom(createOpts) // Creates rooms using ????? data:
        .finally(function() {
            if (modal) modal.close();
        })
        .then(function(res) {
            roomId = res.room_id;
            if (opts.dmUserId) {
                // IS THIS WHERE TAGS ARE SET?
                // WHAT DOES THIS DO?
                // DOESN'T RUN WHEN CREATING NEW CHAT
                return Rooms.setDMRoom(roomId, opts.dmUserId);
            } else {
                return Promise.resolve();
            }
        })
        .then(
            function() {
                // NB createRoom doesn't block on the client seeing the echo that the
                // room has been created, so we race here with the client knowing that
                // the room exists, causing things like
                // https://github.com/vector-im/vector-web/issues/1813
                //debugger;
                if (opts.andView) {
                    // console.log("WHAT IS OPTS.andView", opts.andView); // BOOLEAN
                    // console.log("/********** 4th ***********/");
                    // console.log("OPTS AND VIEW METHOD RUN");
                    // console.log("DISPATCHING VIEW ROOM");
                    dis.dispatch({
                        action: "view_room",
                        room_id: roomId,
                        should_peek: false,
                        // Creating a room will have joined us to the room,
                        // so we are expecting the room to come down the sync
                        // stream, if it hasn't already.
                        joining: true,
                        // CUSTOM KEY TO DETERMINE IF PHONE CALL
                        phone
                    });
                }
                // debugger;
                // does room get created here? YES - gets placed in ROOMS list
                // console.log(">>>>>>>>> FINISHED <<<<<<<<<<<<", roomId);
                // goes to MatrixChat line 1016
                return roomId;
            },
            // ERROR HANDLING
            function(err) {
                // We also failed to join the room (this sets joining to false in RoomViewStore)
                dis.dispatch({
                    action: "join_room_error"
                });
                console.error("Failed to create room " + roomId + " " + err);
                let description = _t(
                    "Server may be unavailable, overloaded, or you hit a bug."
                );
                if (err.errcode === "M_UNSUPPORTED_ROOM_VERSION") {
                    // Technically not possible with the UI as of April 2019 because there's no
                    // options for the user to change this. However, it's not a bad thing to report
                    // the error to the user for if/when the UI is available.
                    description = _t(
                        "The server does not support the room version specified."
                    );
                }
                Modal.createTrackedDialog(
                    "Failure to create room",
                    "",
                    ErrorDialog,
                    {
                        title: _t("Failure to create room"),
                        description
                    }
                );
                return null;
            }
        );
} // END OF CREATE ROOM FUNCTION

module.exports = createRoom;
