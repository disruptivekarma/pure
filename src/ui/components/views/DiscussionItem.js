import React, { Component, PropTypes } from 'react';
import ReactNative from 'react-native';
import Colors from '../../Colors';
import NotificationBadgeContainer from '../containers/NotificationBadgeContainer';
import Card from './Card';
import CardTitle from './CardTitle';
import DiscussionSummary from './DiscussionSummary';
import DiscussionFooter from './DiscussionFooter';
import TouchFeedback from './TouchFeedback';
import Modal from './Modal';
import Icon from './Icon';
import Share from '../../modules/Share';
import textUtils from '../../../lib/text-utils';
import { convertRouteToURL } from '../../../lib/Route';
import { config } from '../../../core-client';

const {
	Clipboard,
	Linking,
	ToastAndroid,
	StyleSheet,
	TouchableOpacity,
	NavigationActions,
	View
} = ReactNative;

const styles = StyleSheet.create({
	item: {
		marginHorizontal: 16
	},
	footer: {
		marginVertical: 12
	},
	topArea: {
		flexDirection: 'row'
	},
	title: {
		flex: 1,
		marginTop: 16
	},
	badge: {
		margin: 12
	},
	expand: {
		marginHorizontal: 16,
		marginVertical: 12,
		color: Colors.fadedBlack
	},
	hidden: {
		opacity: 0.3
	}
});

export default class DiscussionItem extends Component {
	shouldComponentUpdate(nextProps) {
		return (
				this.props.hidden !== nextProps.hidden ||
				this.props.thread.title !== nextProps.thread.title ||
				this.props.thread.text !== nextProps.thread.text ||
				this.props.thread.from !== nextProps.thread.from
			);
	}

	_copyToClipboard = text => {
		Clipboard.setString(text);
		ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
	};

	_handleShowMenu = () => {
		const { thread } = this.props;
		const menu = {};

		menu['Copy title'] = () => this._copyToClipboard(thread.title);

		const metadata = textUtils.getMetadata(thread.text);

		if (metadata && metadata.type === 'photo') {
			menu['Open image in browser'] = () => Linking.openURL(metadata.url);
			menu['Copy image link'] = () => this._copyToClipboard(metadata.url);
		} else {
			menu['Copy summary'] = () => this._copyToClipboard(thread.text);
		}

		menu['Share discussion'] = () => {
			Share.shareItem('Share discussion', config.server.protocol + '//' + config.server.host + convertRouteToURL({
				name: 'chat',
				props: {
					room: thread.to,
					thread: thread.id,
					title: thread.title
				}
			}));
		};

		if (this.props.isCurrentUserAdmin()) {
			if (this.props.hidden) {
				menu['Unhide discussion'] = () => this.props.unhideText();
			} else {
				menu['Hide discussion'] = () => this.props.hideText();
			}

			if (thread.from !== this.props.currentUser) {
				if (this.props.isUserBanned()) {
					menu['Unban ' + thread.from] = () => this.props.unbanUser();
				} else {
					menu['Ban ' + thread.from] = () => this.props.banUser();
				}
			}
		}

		Modal.showActionSheetWithItems(menu);
	};

	_handlePress = () => {
		const { thread } = this.props;

		this.props.onNavigation(new NavigationActions.Push({
			name: 'chat',
			props: {
				thread: thread.id,
				room: thread.to
			}
		}));
	};

	render() {
		const {
			thread,
			hidden
		} = this.props;

		return (
			<Card {...this.props}>
				<TouchFeedback onPress={this._handlePress}>
					<View style={hidden ? styles.hidden : null}>
						<View style={styles.topArea}>
							<CardTitle style={[ styles.item, styles.title ]}>
								{this.props.thread.title}
							</CardTitle>

							<NotificationBadgeContainer thread={this.props.thread.id} style={styles.badge} />

							<TouchableOpacity onPress={this._handleShowMenu}>
								<Icon
									name='expand-more'
									style={styles.expand}
									size={20}
								/>
							</TouchableOpacity>
						</View>

						<DiscussionSummary text={thread.text} />
						<DiscussionFooter style={[ styles.item, styles.footer ]} thread={thread} />
					</View>
				</TouchFeedback>
			</Card>
		);
	}
}

DiscussionItem.propTypes = {
	thread: PropTypes.shape({
		id: PropTypes.string.isRequired,
		title: PropTypes.string.isRequired,
		text: PropTypes.string.isRequired,
		from: PropTypes.string.isRequired,
		to: PropTypes.string.isRequired
	}).isRequired,
	onNavigation: PropTypes.func.isRequired,
	currentUser: PropTypes.string.isRequired,
	hidden: PropTypes.bool.isRequired,
	isCurrentUserAdmin: PropTypes.func.isRequired,
	isUserBanned: PropTypes.func.isRequired,
	hideText: PropTypes.func.isRequired,
	unhideText: PropTypes.func.isRequired,
	banUser: PropTypes.func.isRequired,
	unbanUser: PropTypes.func.isRequired
};
