
/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * @generated by codegen project: GeneratePropsH.js
 */
#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/graphics/Color.h>
#include <react/renderer/imagemanager/primitives.h>

namespace facebook::react {

enum class RNCProgressViewProgressViewStyle { Default, Bar };

static inline void fromRawValue(const PropsParserContext& context, const RawValue &value, RNCProgressViewProgressViewStyle &result) {
  auto string = (std::string)value;
  if (string == "default") { result = RNCProgressViewProgressViewStyle::Default; return; }
  if (string == "bar") { result = RNCProgressViewProgressViewStyle::Bar; return; }
  abort();
}

static inline std::string toString(const RNCProgressViewProgressViewStyle &value) {
  switch (value) {
    case RNCProgressViewProgressViewStyle::Default: return "default";
    case RNCProgressViewProgressViewStyle::Bar: return "bar";
  }
}

class RNCProgressViewProps final : public ViewProps {
 public:
  RNCProgressViewProps() = default;
  RNCProgressViewProps(const PropsParserContext& context, const RNCProgressViewProps &sourceProps, const RawProps &rawProps);

#pragma mark - Props

  RNCProgressViewProgressViewStyle progressViewStyle{RNCProgressViewProgressViewStyle::Default};
  Float progress{0.0};
  SharedColor progressTintColor{};
  SharedColor trackTintColor{};
  ImageSource progressImage{};
  ImageSource trackImage{};
  bool isIndeterminate{false};
};

} // namespace facebook::react