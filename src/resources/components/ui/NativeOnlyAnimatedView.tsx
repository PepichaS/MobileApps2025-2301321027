import * as React from "react";
import Animated from "react-native-reanimated";

type NativeOnlyAnimatedViewProps = React.ComponentProps<typeof Animated.View>;

function NativeOnlyAnimatedView(props: NativeOnlyAnimatedViewProps) {
  return <Animated.View {...props} />;
}

export { NativeOnlyAnimatedView };


