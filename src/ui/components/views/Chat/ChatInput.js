/* @flow */

import React, { Component, PropTypes } from 'react';
import ReactNative from 'react-native';
import shallowCompare from 'react-addons-shallow-compare';
import ImageChooser from 'react-native-image-chooser';
import Icon from '../Core/Icon';
import GrowingTextInput from '../Core/GrowingTextInput';
import TouchFeedback from '../Core/TouchFeedback';
import ChatSuggestionsContainer from '../../containers/ChatSuggestionsContainer';
import ImageUploadContainer from '../../containers/ImageUploadContainer';
import ImageUploadChat from '../ImageUpload/ImageUploadChat';
import Colors from '../../../Colors';

const {
	StyleSheet,
	View,
	PixelRatio,
} = ReactNative;

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'stretch',
		backgroundColor: Colors.white,
		borderColor: Colors.underlay,
		borderTopWidth: 1 / PixelRatio.get(),
		elevation: 4,
	},
	inputContainer: {
		flex: 1,
		paddingHorizontal: 16,
	},
	input: {
		paddingVertical: 8,
		margin: 0,
		backgroundColor: 'transparent',
		color: Colors.black,
	},
	iconContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	icon: {
		color: Colors.fadedBlack,
		margin: 17,
	},
});

type Props = {
	room: string;
	thread: string;
	user: string;
	sendMessage: Function;
}

type State = {
	text: string;
	query: string;
	photo: ?{
		uri: string;
		size: number;
		name: string;
		height: number;
		width: number;
	};
}

export default class ChatInput extends Component<void, Props, State> {
	static propTypes = {
		room: PropTypes.string.isRequired,
		thread: PropTypes.string.isRequired,
		user: PropTypes.string.isRequired,
		sendMessage: PropTypes.func.isRequired,
	};

	state: State = {
		text: '',
		query: '',
		photo: null,
	};

	shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
		return shallowCompare(this, nextProps, nextState);
	}

	setQuotedText: Function = (text) => {
		this._computeAndSetText({
			replyTo: text.creator,
			quotedText: text.body,
		});
	};

	setReplyTo: Function = (text) => {
		this._computeAndSetText({
			replyTo: text.creator,
		});
	};

	_input: Object;

	_sendMessage: Function = () => {
		const {
			room,
			thread,
			user,
		} = this.props;

		this.props.sendMessage({
			body: this.state.text,
			room,
			thread,
			user,
		});

		this.setState({
			text: '',
		});
	};

	_handleUploadImage: Function = async () => {
		try {
			this.setState({
				photo: null,
			});

			const photo = await ImageChooser.pickImage();

			this.setState({
				photo,
			});
		} catch (e) {
			// Do nothing
		}
	};

	_handleUploadFinish: Function = ({ id, result }) => {
		const {
			room,
			thread,
			user,
		} = this.props;
		const {
			photo,
		} = this.state;

		if (!result.url || !photo) {
			return;
		}

		const { height, width, name } = photo;
		const aspectRatio = height / width;

		this.props.sendMessage({
			id,
			room,
			thread,
			user,
			body: `${photo.name}: ${result.url}`,
			meta: {
				photo: {
					height,
					width,
					title: name,
					url: result.url,
					thumbnail_height: Math.min(480, width) * aspectRatio,
					thumbnail_width: Math.min(480, width),
					thumbnail_url: result.thumbnail,
					type: 'photo',
				},
			},
		});

		setTimeout(() => this._handleUploadClose(), 500);
	};

	_handleUploadClose: Function = () => {
		this.setState({
			photo: null,
		});
	};

	_handleSuggestionSelect: Function = (user: { id: string }) => {
		this.setState({
			text: '@' + user.id + ' ',
			query: '',
		});
	};

	_handleChangeText: Function = text => {
		const query = /^@[a-z0-9]*$/.test(text) ? text.replace(/^@/, '') : '';

		this.setState({
			text,
			query,
		});
	};

	_computeAndSetText: Function = opts => {
		const quotedText = opts.quotedText ? opts.quotedText.replace(/\n/g, ' ') : null;

		let newValue = this.state.text;

		if (quotedText) {
			if (newValue) {
				newValue += '\n\n';
			}

			newValue += '> ' + (opts.replyTo ? '@' + opts.replyTo + ' - ' : '') + quotedText + '\n\n';
		} else if (opts.replyTo) {
			if (newValue) {
				newValue += ' ';
			}

			newValue += `@${opts.replyTo} `;
		}

		this.setState({
			text: newValue,
		}, () => this._input.focusKeyboard());
	};

	render() {
		return (
			<View {...this.props}>
				<ChatSuggestionsContainer
					user={this.props.user}
					prefix={this.state.query}
					style={styles.suggestions}
					onSelect={this._handleSuggestionSelect}
				/>

				<View style={styles.container}>
					<GrowingTextInput
						ref={c => (this._input = c)}
						value={this.state.text}
						onChangeText={this._handleChangeText}
						underlineColorAndroid='transparent'
						placeholder='Write a message…'
						autoCapitalize='sentences'
						numberOfLines={7}
						style={styles.inputContainer}
						inputStyle={styles.input}
					/>

					<TouchFeedback
						borderless
						onPress={this.state.text ? this._sendMessage : this._handleUploadImage}
					>
						<View style={styles.iconContainer}>
							<Icon
								name={this.state.text ? 'send' : 'image'}
								style={styles.icon}
								size={24}
							/>
						</View>
					</TouchFeedback>
				</View>

				{this.state.photo ?
					<ImageUploadContainer
						component={ImageUploadChat}
						photo={this.state.photo}
						onUploadClose={this._handleUploadClose}
						onUploadFinish={this._handleUploadFinish}
					/> : null
				}
			</View>
		);
	}
}