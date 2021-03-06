// @flow weak

import React from 'react';
import type { ComponentType, Node } from 'react';
import { findDOMNode } from 'react-dom';
import warning from 'warning';
import classNames from 'classnames';
import getDisplayName from 'recompose/getDisplayName';
import keycode from 'keycode';
import withStyles from '../styles/withStyles';
import { listenForFocusKeys, detectKeyboardFocus, focusKeyPressed } from '../utils/keyboardFocus';
import TouchRipple from './TouchRipple';
import createRippleHandler from './createRippleHandler';

export const styles = (theme: Object) => ({
  root: {
    position: 'relative',
    // Remove grey highlight
    WebkitTapHighlightColor: theme.palette.common.transparent,
    outline: 'none',
    border: 0,
    cursor: 'pointer',
    userSelect: 'none',
    appearance: 'none',
    textDecoration: 'none',
    // So we take precedent over the style of a native <a /> element.
    color: 'inherit',
  },
  disabled: {
    pointerEvents: 'none', // Disable link interactions
    cursor: 'default',
  },
});

type DefaultProps = {
  classes: Object,
};

export type Props = {
  /**
   * If `true`, the ripples will be centered.
   * They won't start at the cursor interaction position.
   */
  centerRipple?: boolean,
  /**
   * The content of the component.
   */
  children?: Node,
  /**
   * Useful to extend the style applied to components.
   */
  classes?: Object,
  /**
   * @ignore
   */
  className?: string,
  /**
   * The component used for the root node.
   * Either a string to use a DOM element or a component.
   * The default value is a `button`.
   */
  component?: string | ComponentType<*>,
  /**
   * If `true`, the base button will be disabled.
   */
  disabled?: boolean,
  /**
   * If `true`, the ripple effect will be disabled.
   */
  disableRipple?: boolean,
  /**
   * If `true`, the base button will have a keyboard focus ripple.
   * `disableRipple` must also be `false`.
   */
  focusRipple?: boolean,
  /**
   * The CSS class applied while the component is keyboard focused.
   */
  keyboardFocusedClassName?: string,
  /**
   * @ignore
   */
  onBlur?: Function,
  /**
   * @ignore
   */
  onClick?: Function,
  /**
   * @ignore
   */
  onFocus?: Function,
  /**
   * Callback fired when the component is focused with a keyboard.
   * We trigger a `onFocus` callback too.
   */
  onKeyboardFocus?: (event: SyntheticEvent<>) => void,
  /**
   * @ignore
   */
  onKeyDown?: Function,
  /**
   * @ignore
   */
  onKeyUp?: Function,
  /**
   * @ignore
   */
  onMouseDown?: Function,
  /**
   * @ignore
   */
  onMouseLeave?: Function,
  /**
   * @ignore
   */
  onMouseUp?: Function,
  /**
   * @ignore
   */
  onTouchEnd?: Function,
  /**
   * @ignore
   */
  onTouchStart?: Function,
  /**
   * @ignore
   */
  role?: string,
  /**
   * @ignore
   */
  tabIndex?: number | string,
  /**
   * @ignore
   */
  type: string,
};

type AllProps = DefaultProps & Props;

type State = {
  keyboardFocused: boolean,
};

class ButtonBase extends React.Component<AllProps, State> {
  props: AllProps;

  static defaultProps = {
    centerRipple: false,
    focusRipple: false,
    disableRipple: false,
    tabIndex: 0,
    type: 'button',
  };

  state = {
    keyboardFocused: false,
  };

  componentDidMount() {
    listenForFocusKeys();

    warning(
      this.button,
      [
        'Material-UI: you have provided a custom Component to the `component` ' +
          'property of `ButtonBase`.',
        'In order to make the keyboard focus logic work, we need a reference on the root element.',
        'Please provide a class component instead of a functional component.',
        // eslint-disable-next-line prefer-template
        `You need to fix the: ${getDisplayName(this.props.component) === 'component'
          ? String(this.props.component)
          : getDisplayName(this.props.component)} component.`,
      ].join('\n'),
    );
  }

  componentWillUpdate(nextProps, nextState) {
    if (
      this.props.focusRipple &&
      nextState.keyboardFocused &&
      !this.state.keyboardFocused &&
      !this.props.disableRipple
    ) {
      this.ripple.pulsate();
    }
  }

  componentWillUnmount() {
    clearTimeout(this.keyboardFocusTimeout);
  }

  ripple = null;
  keyDown = false; // Used to help track keyboard activation keyDown
  button = null;
  keyboardFocusTimeout = null;
  keyboardFocusCheckTime = 40;
  keyboardFocusMaxCheckTimes = 5;

  focus = () => {
    this.button.focus();
  };

  handleKeyDown = event => {
    const { component, focusRipple, onKeyDown, onClick } = this.props;
    const key = keycode(event);

    // Check if key is already down to avoid repeats being counted as multiple activations
    if (focusRipple && !this.keyDown && this.state.keyboardFocused && key === 'space') {
      this.keyDown = true;
      event.persist();
      this.ripple.stop(event, () => {
        this.ripple.start(event);
      });
    }

    if (onKeyDown) {
      onKeyDown(event);
    }

    // Keyboard accessibility for non interactive elements
    if (
      event.target === this.button &&
      onClick &&
      component &&
      component !== 'a' &&
      component !== 'button' &&
      (key === 'space' || key === 'enter')
    ) {
      event.preventDefault();
      onClick(event);
    }
  };

  handleKeyUp = event => {
    if (this.props.focusRipple && keycode(event) === 'space' && this.state.keyboardFocused) {
      this.keyDown = false;
      event.persist();
      this.ripple.stop(event, () => this.ripple.pulsate(event));
    }
    if (this.props.onKeyUp) {
      this.props.onKeyUp(event);
    }
  };

  handleMouseDown = createRippleHandler(this, 'MouseDown', 'start', () => {
    clearTimeout(this.keyboardFocusTimeout);
    focusKeyPressed(false);
    if (this.state.keyboardFocused) {
      this.setState({ keyboardFocused: false });
    }
  });

  handleMouseUp = createRippleHandler(this, 'MouseUp', 'stop');

  handleMouseLeave = createRippleHandler(this, 'MouseLeave', 'stop', event => {
    if (this.state.keyboardFocused) {
      event.preventDefault();
    }
  });

  handleTouchStart = createRippleHandler(this, 'TouchStart', 'start');

  handleTouchEnd = createRippleHandler(this, 'TouchEnd', 'stop');

  handleBlur = createRippleHandler(this, 'Blur', 'stop', () => {
    this.setState({ keyboardFocused: false });
  });

  handleFocus = event => {
    if (this.props.disabled) {
      return;
    }

    if (this.button) {
      event.persist();

      const keyboardFocusCallback = this.onKeyboardFocusHandler.bind(this, event);
      detectKeyboardFocus(this, findDOMNode(this.button), keyboardFocusCallback);
    }

    if (this.props.onFocus) {
      this.props.onFocus(event);
    }
  };

  onKeyboardFocusHandler = event => {
    this.keyDown = false;
    this.setState({ keyboardFocused: true });

    if (this.props.onKeyboardFocus) {
      this.props.onKeyboardFocus(event);
    }
  };

  renderRipple() {
    if (!this.props.disableRipple && !this.props.disabled) {
      return (
        <TouchRipple
          innerRef={node => {
            this.ripple = node;
          }}
          center={this.props.centerRipple}
        />
      );
    }

    return null;
  }

  render() {
    const {
      centerRipple,
      children,
      classes,
      className: classNameProp,
      component,
      disabled,
      disableRipple,
      focusRipple,
      keyboardFocusedClassName,
      onBlur,
      onFocus,
      onKeyboardFocus,
      onKeyDown,
      onKeyUp,
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onTouchEnd,
      onTouchStart,
      tabIndex,
      type,
      ...other
    } = this.props;

    const className = classNames(
      classes.root,
      {
        [classes.disabled]: disabled,
        // $FlowFixMe
        [keyboardFocusedClassName]: keyboardFocusedClassName && this.state.keyboardFocused,
      },
      classNameProp,
    );

    const buttonProps = {};

    let ComponentProp = component;

    if (!ComponentProp) {
      if (other.href) {
        ComponentProp = 'a';
      } else {
        ComponentProp = 'button';
      }
    }

    if (ComponentProp === 'button') {
      buttonProps.type = type || 'button';
    }

    if (ComponentProp !== 'a') {
      buttonProps.role = buttonProps.role || 'button';
      buttonProps.disabled = disabled;
    }

    return (
      <ComponentProp
        ref={node => {
          this.button = node;
        }}
        onBlur={this.handleBlur}
        onFocus={this.handleFocus}
        onKeyDown={this.handleKeyDown}
        onKeyUp={this.handleKeyUp}
        onMouseDown={this.handleMouseDown}
        onMouseLeave={this.handleMouseLeave}
        onMouseUp={this.handleMouseUp}
        onTouchEnd={this.handleTouchEnd}
        onTouchStart={this.handleTouchStart}
        tabIndex={disabled ? -1 : tabIndex}
        className={className}
        {...buttonProps}
        {...other}
      >
        {children}
        {this.renderRipple()}
      </ComponentProp>
    );
  }
}

export default withStyles(styles, { name: 'MuiButtonBase' })(ButtonBase);
