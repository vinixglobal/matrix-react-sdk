/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import classNames from "classnames";
import dis from "../../../dispatcher";
import MatrixClientPeg from "../../../MatrixClientPeg";
import DMRoomMap from "../../../utils/DMRoomMap";
import sdk from "../../../index";
import { createMenu } from "../../structures/ContextualMenu";
import * as RoomNotifs from "../../../RoomNotifs";
import * as FormattingUtils from "../../../utils/FormattingUtils";
import AccessibleButton from "../elements/AccessibleButton";
import ActiveRoomObserver from "../../../ActiveRoomObserver";
import RoomViewStore from "../../../stores/RoomViewStore";
import SettingsStore from "../../../settings/SettingsStore";
import { _t } from "../../../languageHandler";
import CallHandler from "../../../CallHandler";
import CallTimer from "../elements/CallTimer";
import QuickButton from "../elements/QuickButton";

module.exports = createReactClass({
    displayName: "RoomTile",

    propTypes: {
        onClick: PropTypes.func,
        room: PropTypes.object.isRequired,
        collapsed: PropTypes.bool.isRequired,
        unread: PropTypes.bool.isRequired,
        highlight: PropTypes.bool.isRequired,
        // If true, apply mx_RoomTile_transparent class
        transparent: PropTypes.bool,
        isInvite: PropTypes.bool.isRequired,
        incomingCall: PropTypes.object
    },

    getDefaultProps: function() {
        return {
            isDragging: false
        };
    },

    // GET INITIAL STATE OF EACH ROOM
    getInitialState: function() {
        return {
            hover: false,
            badgeHover: false,
            menuDisplayed: false,
            roomName: this.props.room.name,
            notifState: RoomNotifs.getRoomNotifsState(this.props.room.roomId),
            notificationCount: this.props.room.getUnreadNotificationCount(),
            selected: this.props.room.roomId === RoomViewStore.getRoomId(),
            statusMessage: this._getStatusMessage(),
            callStatus: "idle",
            mute: false, // ONLY USED TO DISPLAY CSS CLASSES
            transfer: false,
            hold: false
            //media: true
        };
    },

    _isDirectMessageRoom: function(roomId) {
        const dmRooms = DMRoomMap.shared().getUserIdForRoomId(roomId);
        return Boolean(dmRooms);
    },

    _shouldShowStatusMessage() {
        if (!SettingsStore.isFeatureEnabled("feature_custom_status")) {
            return false;
        }
        const isInvite = this.props.room.getMyMembership() === "invite";
        const isJoined = this.props.room.getMyMembership() === "join";
        const looksLikeDm =
            this.props.room.getInvitedAndJoinedMemberCount() === 2;
        return !isInvite && isJoined && looksLikeDm;
    },

    _getStatusMessageUser() {
        if (!MatrixClientPeg.get()) return null; // We've probably been logged out

        const selfId = MatrixClientPeg.get().getUserId();
        const otherMember = this.props.room.currentState.getMembersExcept([
            selfId
        ])[0];
        if (!otherMember) {
            return null;
        }
        return otherMember.user;
    },

    _getStatusMessage() {
        const statusUser = this._getStatusMessageUser();
        if (!statusUser) {
            return "";
        }
        return statusUser._unstable_statusMessage;
    },

    onRoomName: function(room) {
        if (room !== this.props.room) return;
        this.setState({
            roomName: this.props.room.name
        });
    },

    onAccountData: function(accountDataEvent) {
        if (accountDataEvent.getType() === "m.push_rules") {
            this.setState({
                notifState: RoomNotifs.getRoomNotifsState(
                    this.props.room.roomId
                )
            });
        }
    },

    onAction: function(payload) {
        switch (payload.action) {
            // XXX: slight hack in order to zero the notification count when a room
            // is read. Ideally this state would be given to this via props (as we
            // do with `unread`). This is still better than forceUpdating the entire
            // RoomList when a room is read.
            case "on_room_read":
                if (payload.roomId !== this.props.room.roomId) break;
                this.setState({
                    notificationCount: this.props.room.getUnreadNotificationCount()
                });
                break;
            // RoomTiles are one of the few components that may show custom status and
            // also remain on screen while in Settings toggling the feature.  This ensures
            // you can clearly see the status hide and show when toggling the feature.
            case "feature_custom_status_changed":
                this.forceUpdate();
                break;
            case "place_call":
                // CALL STATUSES 'hold', 'mute', 'transfer', 'dialpad', 'ringing'
                //console.log("<line 153> *******");
                //console.log("PLACE CALL ACTION IS FORCING UPDATE");
                //console.log("<line 153> *******");
                //console.log("***");
                //console.log("STATE BEFORE UPDATE", this.state);
                //console.log("----- SEPARATE BEFORE - AFTER -----");
                this.setState({ callStatus: "ringing" });
                //this.forceUpdate();
                //console.log("STATE AFTER UPDATE", this.state);
                //console.log("***");
                break;
            //case "mute":
            //this.setState({ mute: !this.state.mute });
            //break;
            /*
            case "hangup":
                // This is needed when RoomTileContextMenu hangs up
                this.setState({ session: false });
                break;
            case "hold":
                // This is needed when RoomTileContextMenu hold
                //this.setState({ hold: true });
                this.setState({ hold: this.state.hold });
                break;
            */
            default:
                return;
        }
    },

    _onActiveRoomChange: function() {
        this.setState({
            selected: this.props.room.roomId === RoomViewStore.getRoomId()
        });
    },

    _getCallForRoom: function() {
        if (!this.props.room) {
            return null;
        }
        return CallHandler.getCallForRoom(this.props.room.roomId);
    },

    componentDidMount: function() {
        const cli = MatrixClientPeg.get();

        cli.on("accountData", this.onAccountData);
        cli.on("Room.name", this.onRoomName);
        ActiveRoomObserver.addListener(
            this.props.room.roomId,
            this._onActiveRoomChange
        );
        this.dispatcherRef = dis.register(this.onAction);
        // console.log("WHAT ACTION GOT DISPATCHED", this.dispatcherRef); // ID_22, ID_24
        // console.log("\n--------------------");
        // console.log("THIS IS WHERE THE CLASSES WILL RE-RENDER");
        // console.log("--------------------\n");

        if (this._shouldShowStatusMessage()) {
            const statusUser = this._getStatusMessageUser();
            if (statusUser) {
                statusUser.on(
                    "User._unstable_statusMessage",
                    this._onStatusMessageCommitted
                );
            }
        }
    },

    componentWillUnmount: function() {
        //console.log("COMPONENT WILL MOUNT RUN <line 224>");
        const cli = MatrixClientPeg.get();
        if (cli) {
            MatrixClientPeg.get().removeListener(
                "accountData",
                this.onAccountData
            );
            MatrixClientPeg.get().removeListener("Room.name", this.onRoomName);
        }
        ActiveRoomObserver.removeListener(
            this.props.room.roomId,
            this._onActiveRoomChange
        );
        dis.unregister(this.dispatcherRef);

        if (this._shouldShowStatusMessage()) {
            const statusUser = this._getStatusMessageUser();
            if (statusUser) {
                statusUser.removeListener(
                    "User._unstable_statusMessage",
                    this._onStatusMessageCommitted
                );
            }
        }
    },

    componentWillReceiveProps: function(props) {
        // XXX: This could be a lot better - this makes the assumption that
        // the notification count may have changed when the properties of
        // the room tile change.
        this.setState({
            notificationCount: this.props.room.getUnreadNotificationCount()
            //callState: "ringback"
        });
        if (this.callState === "ringback") {
            this.setState({ callState: "ringback" });
        }
    },

    // Do a simple shallow comparison of props and state to avoid unnecessary
    // renders. The assumption made here is that only state and props are used
    // in rendering this component and children.
    //
    // RoomList is frequently made to forceUpdate, so this decreases number of
    // RoomTile renderings.
    shouldComponentUpdate: function(newProps, newState) {
        if (Object.keys(newProps).some(k => newProps[k] !== this.props[k])) {
            return true;
        }
        if (Object.keys(newState).some(k => newState[k] !== this.state[k])) {
            return true;
        }
        return false;
    },

    _onStatusMessageCommitted() {
        // The status message `User` object has observed a message change.
        this.setState({
            statusMessage: this._getStatusMessage()
        });
    },

    callSession: function() {
        this.setState({ session: !this.state.session });
    },

    onClick: function(ev) {
        if (this.props.onClick) {
            this.props.onClick(this.props.room.roomId, ev);
        }
    },

    onMouseEnter: function() {
        this.setState({ hover: true });
        this.badgeOnMouseEnter();
    },

    onMouseLeave: function() {
        this.setState({ hover: false });
        this.badgeOnMouseLeave();
    },

    _showContextMenu: function(x, y, chevronOffset) {
        const RoomTileContextMenu = sdk.getComponent(
            "context_menus.RoomTileContextMenu"
        );

        createMenu(RoomTileContextMenu, {
            chevronOffset,
            left: x,
            top: y,
            room: this.props.room,
            onFinished: () => {
                this.setState({ menuDisplayed: false });
                this.props.refreshSubList();
            }
        });
        this.setState({ menuDisplayed: true });
    },

    onContextMenu: function(e) {
        // Prevent the RoomTile onClick event firing as well
        e.preventDefault();
        // Only allow non-guests to access the context menu
        if (MatrixClientPeg.get().isGuest()) return;

        const chevronOffset = 12;
        this._showContextMenu(
            e.clientX,
            e.clientY - (chevronOffset + 8),
            chevronOffset
        );
    },

    badgeOnMouseEnter: function() {
        // Only allow non-guests to access the context menu
        // and only change it if it needs to change
        if (!MatrixClientPeg.get().isGuest() && !this.state.badgeHover) {
            this.setState({ badgeHover: true });
        }
    },

    badgeOnMouseLeave: function() {
        this.setState({ badgeHover: false });
    },

    onOpenMenu: function(e) {
        // Prevent the RoomTile onClick event firing as well
        e.stopPropagation();
        // Only allow non-guests to access the context menu
        if (MatrixClientPeg.get().isGuest()) return;

        // If the badge is clicked, then no longer show tooltip
        if (this.props.collapsed) {
            this.setState({ hover: false });
        }

        const elementRect = e.target.getBoundingClientRect();

        // The window X and Y offsets are to adjust position when zoomed in to page
        const x = elementRect.right + window.pageXOffset + 3;
        const chevronOffset = 12;
        let y = elementRect.top + elementRect.height / 2 + window.pageYOffset;
        y = y - (chevronOffset + 8); // where 8 is half the height of the chevron

        this._showContextMenu(x, y, chevronOffset);
    },

    // DETERMINES THE ICONS ON HOVER
    callStateCheck: function() {
        const call = this._getCallForRoom();
        //console.log("DOES THIS CALL HAVE ANY DATA FROM MUTE", call);
        //console.log("======================");
        //console.log("CURRENT CALL STATE", call);
        //console.log("======================");

        const callState = call ? call.call_state : "ended";
        //console.log(
        ///"THIS SHOULD LOOK AT THE CALL STATUS INSTEAD OF STATE", // ENDED
        //callState
        //);
        //console.log("CALL STATUS IS: ", this.state.callStatus); // IDLE
        // TODO
        // NEED LOGIC TO CANCEL OUT PREVIOUS CALL STATE
        // IF HOLD THEN MUTE IS CLICKED, ONLY MUTE SHOULD BE SHOWN
        //const mute = true;
        const mute = call ? (call.mute ? call.mute : false) : false;
        const hold = call ? (call.hold ? call.hold : false) : false;
        const transfer = call ? (call.transfer ? call.transfer : false) : false;
        //console.log("MUTE", mute);
        //console.log("HOLD", hold);
        //console.log("TRANSFER", transfer);
        //const hold = call.hold;
        //const transfer = call.transfer;
        //console.log("======");
        // THIS DOESN'T HAPPEN FAST ENOUGH
        // Call state is set at 'ended' multiple times before 'ringback' is set
        //console.log("SETTING NEW CALL STATE TO: ", callState);
        //console.log("======");
        this.setState({ callState, mute, hold, transfer }); // THIS SHOULD RE-RENDER
        //console.log("THIS IS THE CURRENT CALL STATE", this.state.callState);
        // PROBLEM - why doesn't the current state change the component state?
        // ANSWER - re-render only happens on state or prop change
    },
    changeToActive: function() {
        //console.log("RUNNING CHANGE TO ACTIVE");
        dis.dispatch({
            action: "place_call",
            type: "voice",
            room_id: this.props.room.roomId
        });
        this.setState({ callState: "ringback" });
        //console.log("*******");
        //console.log("THIS SHOULD RE_RENDER THE COMPONENT");
        //console.log("*******");
    },
    changeToIdle: function() {
        this.setState({ callState: "ended" });
    },
    phoneCall: function() {
        this.changeToActive();
        //this.onVoiceCallClick();
    },

    render: function() {
        //return <div>CATS</div>; // WORKS
        this.callStateCheck(); // WHY IS THERE A CHECK EACH TIME -needed for the hover call buttons
        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        const CallButton = props => {
            // console.log("DOES THE ROOM TILE COMPONENT STOP ON CALL BUTTON");
            /*const onVoiceCallClick = ev => {
                dis.dispatch({
               r    action: "place_call",
                    type: "voice",
                    room_id: props.roomId
                });
            };*/
            //this.changeToActive();
            return (
                <AccessibleButton
                    id="call_button"
                    className="mx_MessageComposer_button mx_MessageComposer_voicecall"
                    onClick={this.phoneCall}
                    title={_t("Voice call")}
                />
            );
        };
        //return <div>DOGS</div>; // WORKS
        const VideoButton = props => {
            const AccessibleButton = sdk.getComponent(
                "elements.AccessibleButton"
            );
            const onCallClick = ev => {
                dis.dispatch({
                    action: "place_call",
                    type: ev.shiftKey ? "screensharing" : "video",
                    room_id: props.roomId
                });
            };
            //this.changeToActive();
            return (
                <AccessibleButton
                    className="mx_MessageComposer_button mx_MessageComposer_videocall"
                    onClick={onCallClick}
                    title={_t("Video call")}
                />
            );
        };
        //return <div>FISH</div>; // WORKS
        const HangupButton = props => {
            const AccessibleButton = sdk.getComponent(
                "elements.AccessibleButton"
            );
            const onHangupClick = () => {
                const call = CallHandler.getCallForRoom(props.roomId);
                if (!call) return;
                dis.dispatch({
                    action: "hangup",
                    room_id: call.roomId
                });
            };
            //this.changeToIdle();
            return (
                <AccessibleButton
                    className="mx_MessageComposer_button mx_MessageComposer_hangup"
                    onClick={onHangupClick}
                    title={_t("Hangup")}
                />
            );
        };
        /*
        const MuteButton = props => {
            const AccessibleButton = sdk.getComponent(
                "elements.AccessibleButton"
            );
            const onMuteButtonClick = () => {
                const call = CallHandler.getCallForRoom(props.roomId);
                if (!call) return;
                if (this.state.callState === "connected") {
                    dis.dispatch({
                        action: "mute",
                        room_id: call.roomId,
                        call
                    });
                }
                setState({ mute: !this.state.mute });
                return (
                    <AccessibleButton
                        className="mx_MessageComposer_button mx_MessageCompose_hangup"
                        onClick={onHangupClick}
                        title={_t("Mute")}
                    />
                );
            };
        };*/

        //return <div>BEFORE INVITE CHECK</div>; // WORKS
        const isInvite = this.props.room.getMyMembership() === "invite";
        const notificationCount = this.props.notificationCount;
        // var highlightCount = this.props.room.getUnreadNotificationCount("highlight");

        const notifBadges =
            notificationCount > 0 &&
            RoomNotifs.shouldShowNotifBadge(this.state.notifState);
        const mentionBadges =
            this.props.highlight &&
            RoomNotifs.shouldShowMentionBadge(this.state.notifState);
        const badges = notifBadges || mentionBadges;

        let subtext = null;

        // WHEN THIS CHANGES IT SHOULD UPDATE THE STATE OR PROPS
        //return <div>BEFORE CLASSES</div>; // WORKS
        //callStatus: "idle",
        const classes = classNames({
            mx_RoomTile: true,
            mx_RoomTile_selected: this.state.selected,
            mx_RoomTile_unread: this.props.unread,
            mx_RoomTile_unreadNotify: notifBadges,
            mx_RoomTile_highlight: mentionBadges,
            mx_RoomTile_invited: isInvite,
            mx_RoomTile_menuDisplayed: this.state.menuDisplayed,
            mx_RoomTile_noBadges: !badges,
            mx_RoomTile_transparent: this.props.transparent,
            mx_RoomTile_hasSubtext: subtext && !this.props.collapsed,
            mx_RoomTile_calls: this.props.calls,
            mx_RoomTile_transfer: this.state.callStatus === "transfer",
            mx_RoomTile_hold: this.state.callStatus === "hold",
            mx_RoomTile_mute: this.state.callStatus === "mute",
            mx_RoomTile_dialpad: this.state.callStatus === "dialpad",
            mx_RoomTile_calling: this.state.callState === "ringback", // THIS DOES NOT TRIGGER STATE CHANGE
            mx_RoomTile_call: this.state.callState === "connected"
        });

        //console.log("*** WHAT IS CLASSES? PACKAGE", classes); //'Classes do not change until subsequent render'

        const avatarClasses = classNames({
            mx_RoomTile_avatar: true
        });

        const badgeClasses = classNames({
            mx_RoomTile_badge: true,
            mx_RoomTile_badgeButton:
                this.state.badgeHover || this.state.menuDisplayed
        });

        if (this._shouldShowStatusMessage()) {
            //console.log("RUNNING SHOW STATUS MESSAGE");
            subtext = this.state.statusMessage;
        }
        //return <div>SUB TEXT IS {this.state.statusMessage}</div>; // WORKS

        let name = this.state.roomName;
        if (name == undefined || name == null) name = "";
        name = name.replace(":", ":\u200b"); // add a zero-width space to allow linewrapping after the colon

        let badge;
        if (badges) {
            //console.log("BADGES EXIST <line 486>");
            const limitedCount = FormattingUtils.formatCount(notificationCount);
            const badgeContent = notificationCount ? limitedCount : "!";
            // TODO BADGES KEEP GETTING RENDERED
            badge = <div className={badgeClasses}>{badgeContent}</div>;
        }
        //return <div>AFTER BADGES EXIST</div>; // WORKS

        let label;
        let subtextLabel;
        let tooltip;
        if (!this.props.collapsed) {
            // NOT COLLAPSED
            const nameClasses = classNames({
                mx_RoomTile_name: true,
                mx_RoomTile_invite: this.props.isInvite,
                mx_RoomTile_badgeShown:
                    badges || this.state.badgeHover || this.state.menuDisplayed
            });

            subtextLabel = subtext ? (
                <span className="mx_RoomTile_subtext">{subtext}</span>
            ) : null;
            label = (
                <div title={name} className={nameClasses} dir="auto">
                    {name}
                </div>
            );
        } else if (this.state.hover) {
            // COLLAPSED AND HOVERING
            const Tooltip = sdk.getComponent("elements.Tooltip");
            tooltip = (
                <Tooltip
                    className="mx_RoomTile_tooltip"
                    label={this.props.room.name}
                    dir="auto"
                />
            );
        }
        //return <div>COLLAPSED PROPS</div>; // WORKS

        //var incomingCallBox;
        //if (this.props.incomingCall) {
        //    var IncomingCallBox = sdk.getComponent("voip.IncomingCallBox");
        //    incomingCallBox = <IncomingCallBox incomingCall={ this.props.incomingCall }/>;
        //}

        let contextMenuButton;
        let callButtons;

        if (!MatrixClientPeg.get().isGuest()) {
            contextMenuButton = (
                <AccessibleButton
                    className="mx_RoomTile_menuButton"
                    onClick={this.onOpenMenu}
                />
            );
        }
        //return <div>CONTEXT MENU IS GUEST CHECK</div>; // WORKS

        const RoomAvatar = sdk.getComponent("avatars.RoomAvatar");

        let ariaLabel = name;

        let dmIndicator;
        if (this._isDirectMessageRoom(this.props.room.roomId)) {
            //console.log("**");
            //console.log("THIS IS A DIRECT MESSAGE ROOM");
            //console.log("**");

            dmIndicator = (
                <img
                    src={require("../../../../res/img/icon_person.svg")}
                    className="mx_RoomTile_dm"
                    width="11"
                    height="13"
                    alt="dm"
                />
            );
        }

        // The following labels are written in such a fashion to increase screen reader efficiency (speed).
        if (notifBadges && mentionBadges && !isInvite) {
            //console.log("**** #1 NOTIF && MENTION BADGE && NOT AN INVITE ****");
            ariaLabel +=
                " " +
                _t("%(count)s unread messages including mentions.", {
                    count: notificationCount
                });
        } else if (notifBadges) {
            //console.log("**** #2 ONLY NOTIF BADGE ****");
            ariaLabel +=
                " " +
                _t("%(count)s unread messages.", { count: notificationCount });
        } else if (mentionBadges && !isInvite) {
            //console.log("#3 ONLY MENTION BADGE && NO INVITE - UNREAD MENTIONS");
            ariaLabel += " " + _t("Unread mentions.");
        } else if (this.props.unread) {
            //console.log("**** #4 UNREAD MESSAGES ****");
            ariaLabel += " " + _t("Unread messages.");
        }
        // TODO
        // Call Status
        // return <div>BEFORE CALL STATUS CHECK</div>; // WORKS
        //if (this.state.callStatus) {
        //console.log("call status changed");
        //console.log("CURRENT CALL STATE", this.state.callStatus);
        //}
        //return <div>BEFORE CALL STATE CHECK</div>; // WORKS

        // SEPARATE LOGIC
        // call state
        if (this.state.callState) {
            // THIS IS RUN ON EACH RENDER()
            //console.log("\n*************");
            //console.log("#5 THIS IS THE CALL STATE", this.state.callState);
            //console.log("*************\n");

            switch (this.state.callState) {
                case "ringback":
                    callButtons = (
                        <div className="hangup" onClick={this.callSession}>
                            <HangupButton
                                roomId={this.props.room.roomId}
                                key="controls_hangup_button"
                            />
                        </div>
                    );
                    this.setState({
                        notificationCount: 0
                    });
                    // FOLLOWING CAUSES APP TO BREAK
                    //console.log(
                    //"*** FORCING UPDATE ON CALL STATE CHANGE TO RINGBACK"
                    //);
                    //this.forceUpdate();
                    break;
                case "connected":
                    // TODO
                    // PROPS SHOULD PASS TO DETERMINE QUICK BUTTON
                    let type = this.state.mute
                        ? "mute"
                        : this.state.hold
                        ? "hold"
                        : this.state.transfer
                        ? "transfer"
                        : null;
                    let visible = this.state.mute
                        ? "quick_button_mute"
                        : this.state.hold
                        ? "quick_button_hold"
                        : this.state.transfer
                        ? "quick_button_transfer"
                        : "hide_quick";
                    // TYPE IS NOT NEEDED FOR SESSION TIMER
                    callButtons = (
                        <React.Fragment>
                            <CallTimer
                                mute={false}
                                transfer={false}
                                hold={false}
                            />
                            <QuickButton />
                            {/*
                            <QuickButton type={type} className={visible} />
                            */}
                        </React.Fragment>
                    );

                    this.setState({
                        notificationCount: 0
                    });
                    break;
                case "ended":
                    callButtons = (
                        <div
                            className="call_buttons"
                            onClick={this.callSession}
                        >
                            <CallButton
                                roomId={this.props.room.roomId}
                                key="controls_call_button"
                            />
                            <VideoButton
                                roomId={this.props.room.roomId}
                                key="controls_videocall_button"
                            />
                        </div>
                    );
                    this.setState({
                        notificationCount: 0
                    });
            }
        } // end of callState check
        switch (this.state.callStatus) {
            case "mute":
                this.setState({
                    mute: true,
                    hold: false,
                    transfer: false,
                    dialpad: false
                });
                break;
            case "hold":
                this.setState({
                    mute: false,
                    hold: true,
                    transfer: false,
                    dialpad: false
                });
                break;
            case "transfer":
                this.setState({
                    mute: false,
                    hold: false,
                    transfer: true,
                    dialpad: false
                });
                break;
            case "dialpad":
                this.setState({
                    mute: false,
                    hold: false,
                    transfer: false,
                    dialpad: true
                });
                break;
            case "idle":
                this.setState({
                    mute: false,
                    hold: false,
                    transfer: false,
                    dialpad: false
                });
                break;
            default:
            //console.log("<*************>");
            //console.log("CALL STATUS", this.state.callStatus);
            //console.log("<*************>");
            //return; // BREAKS THE FOLLOWING LINES
        }
        return (
            <AccessibleButton
                tabIndex="0"
                className={classes}
                onClick={this.onClick}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                onContextMenu={this.onContextMenu}
                aria-label={ariaLabel}
                aria-selected={this.state.selected}
                role="treeitem"
            >
                <div className={avatarClasses}>
                    <div className="mx_RoomTile_avatar_container">
                        <RoomAvatar
                            room={this.props.room}
                            width={24}
                            height={24}
                        />
                        {dmIndicator}
                    </div>
                </div>
                <div className="mx_RoomTile_nameContainer">
                    <div className="mx_RoomTile_labelContainer">
                        {label}
                        {subtextLabel}
                    </div>
                    {callButtons}
                    {contextMenuButton}
                    {/*{badge}*/}
                </div>
                {/* { incomingCallBox } */}
                {tooltip}
            </AccessibleButton>
        );
    } //END OF RENDER FUNCTION
});
