export interface BaseMessage {
  type: string;
}

export interface LocationMessage extends BaseMessage {
  type: 'GET_LOCATION';
}

export interface CameraMessage extends BaseMessage {
  type: 'OPEN_CAMERA';
  mode: 'camera' | 'picker';
  inputId: string;
  multiple: boolean;
}

export interface VibrateMessage extends BaseMessage {
  type: 'VIBRATE';
  pattern?: number | number[];
}

export interface AuthTokenMessage extends BaseMessage {
  type: 'auth_token';
  payload: {
    token: string;
    userType: string;
    userId: string;
  };
}

export interface RequestPushTokenMessage extends BaseMessage {
  type: 'request_push_token';
  payload: {
    userId: string;
  };
}

export interface LogoutMessage extends BaseMessage {
  type: 'logout';
}

export interface EnableDriverModeMessage extends BaseMessage {
  type: 'ENABLE_DRIVER_MODE';
}

export interface DisableDriverModeMessage extends BaseMessage {
  type: 'DISABLE_DRIVER_MODE';
}

export interface RazorpayPaymentMessage extends BaseMessage {
  type: 'RAZORPAY_PAYMENT';
  payload: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    purpose?: string;
    orderPayload?: any;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
  };
}

export interface SetThemeMessage extends BaseMessage {
  type: 'SET_THEME';
  payload: {
    primaryColor: string;
    headerColor: string;
    statusBarColor: string;
    secondaryColor?: string;
    /** Colour of the strip below the bottom navigation (home indicator / Android nav bar). */
    navigationBarColor?: string;
  };
}

/** Sent automatically by the injected bridge; colours sampled from the page edges. */
export interface EdgeColorsMessage extends BaseMessage {
  type: 'EDGE_COLORS';
  payload: {
    top: string;
    bottom: string;
  };
}

export type WebViewMessage =
  | LocationMessage
  | CameraMessage
  | VibrateMessage
  | AuthTokenMessage
  | RequestPushTokenMessage
  | LogoutMessage
  | EnableDriverModeMessage
  | DisableDriverModeMessage
  | RazorpayPaymentMessage
  | SetThemeMessage
  | EdgeColorsMessage;
