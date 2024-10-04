import type {MarkdownStyle} from '@expensify/react-native-live-markdown';
import lodashDebounce from 'lodash/debounce';
import type {BaseSyntheticEvent, ForwardedRef} from 'react';
import React, {useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
// eslint-disable-next-line no-restricted-imports
import type {NativeSyntheticEvent, Text as RNText, TextInput, TextInputKeyPressEventData, TextInputSelectionChangeEventData, ViewStyle} from 'react-native';
import {DeviceEventEmitter, StyleSheet, View} from 'react-native';
import type {AnimatedMarkdownTextInputRef} from '@components/RNMarkdownTextInput';
import RNMarkdownTextInput from '@components/RNMarkdownTextInput';
import Text from '@components/Text';
import useHtmlPaste from '@hooks/useHtmlPaste';
import useIsScrollBarVisible from '@hooks/useIsScrollBarVisible';
import useMarkdownStyle from '@hooks/useMarkdownStyle';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import * as Browser from '@libs/Browser';
import updateIsFullComposerAvailable from '@libs/ComposerUtils/updateIsFullComposerAvailable';
import * as EmojiUtils from '@libs/EmojiUtils';
import * as FileUtils from '@libs/fileDownload/FileUtils';
import isEnterWhileComposition from '@libs/KeyboardShortcut/isEnterWhileComposition';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {ComposerProps} from './types';

/**
 * Retrieves the characters from the specified cursor position up to the next space or new line.
 *
 * @param inputString - The input string.
 * @param cursorPosition - The position of the cursor within the input string.
 * @returns - The substring from the cursor position up to the next space or new line.
 *                     If no space or new line is found, returns the substring from the cursor position to the end of the input string.
 */
const getNextChars = (inputString: string, cursorPosition: number): string => {
    // Get the substring starting from the cursor position
    const subString = inputString.substring(cursorPosition);

    // Find the index of the next space or new line character
    const spaceIndex = subString.search(/[ \n]/);

    if (spaceIndex === -1) {
        return subString;
    }

    // If there is a space or new line, return the substring up to the space or new line
    return subString.substring(0, spaceIndex);
};

const excludeNoStyles: Array<keyof MarkdownStyle> = [];
const excludeReportMentionStyle: Array<keyof MarkdownStyle> = ['mentionReport'];

// Enable Markdown parsing.
// On web we like to have the Text Input field always focused so the user can easily type a new chat
function Composer(
    {
        value,
        defaultValue,
        maxLines = -1,
        onKeyPress = () => {},
        style,
        autoFocus = false,
        shouldCalculateCaretPosition = false,
        isDisabled = false,
        onClear = () => {},
        onPasteFile = () => {},
        onSelectionChange = () => {},
        setIsFullComposerAvailable = () => {},
        checkComposerVisibility = () => false,
        selection: selectionProp = {
            start: 0,
            end: 0,
        },
        isComposerFullSize = false,
        shouldContainScroll = true,
        isGroupPolicyReport = false,
        ...props
    }: ComposerProps,
    ref: ForwardedRef<TextInput | HTMLInputElement>,
) {
    const textContainsOnlyEmojis = useMemo(() => EmojiUtils.containsOnlyEmojis(value ?? ''), [value]);
    const theme = useTheme();
    const styles = useThemeStyles();
    const markdownStyle = useMarkdownStyle(value, !isGroupPolicyReport ? excludeReportMentionStyle : excludeNoStyles);
    const StyleUtils = useStyleUtils();
    const textRef = useRef<HTMLElement & RNText>(null);
    const textInput = useRef<AnimatedMarkdownTextInputRef | null>(null);
    const [selection, setSelection] = useState<
        | {
              start: number;
              end?: number;
              positionX?: number;
              positionY?: number;
          }
        | undefined
    >({
        start: selectionProp.start,
        end: selectionProp.end,
    });
    const [caretContent, setCaretContent] = useState('');
    const [valueBeforeCaret, setValueBeforeCaret] = useState('');
    const [textInputWidth, setTextInputWidth] = useState<ViewStyle['width']>('');
    const [hasMultipleLines, setHasMultipleLines] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const isScrollBarVisible = useIsScrollBarVisible(textInput, value ?? '');
    const [prevScroll, setPrevScroll] = useState<number | undefined>();
    const isReportFlatListScrolling = useRef(false);

    useEffect(() => {
        if (!!selection && selectionProp.start === selection.start && selectionProp.end === selection.end) {
            return;
        }
        setSelection(selectionProp);
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    }, [selectionProp]);

    /**
     *  Adds the cursor position to the selection change event.
     */
    const addCursorPositionToSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const webEvent = event as BaseSyntheticEvent<TextInputSelectionChangeEventData>;
        if (shouldCalculateCaretPosition && isRendered) {
            // we do flushSync to make sure that the valueBeforeCaret is updated before we calculate the caret position to receive a proper position otherwise we will calculate position for the previous state
            flushSync(() => {
                setValueBeforeCaret((webEvent.target as HTMLInputElement).value.slice(0, webEvent.nativeEvent.selection.start));
                setCaretContent(getNextChars(value ?? '', webEvent.nativeEvent.selection.start));
            });
            const selectionValue = {
                start: webEvent.nativeEvent.selection.start,
                end: webEvent.nativeEvent.selection.end,
                positionX: (textRef.current?.offsetLeft ?? 0) - CONST.SPACE_CHARACTER_WIDTH,
                positionY: textRef.current?.offsetTop,
            };

            onSelectionChange({
                ...webEvent,
                nativeEvent: {
                    ...webEvent.nativeEvent,
                    selection: selectionValue,
                },
            });
            setSelection(selectionValue);
        } else {
            onSelectionChange(webEvent);
            setSelection(webEvent.nativeEvent.selection);
        }
    };

    /**
     * Check the paste event for an attachment, parse the data and call onPasteFile from props with the selected file,
     * Otherwise, convert pasted HTML to Markdown and set it on the composer.
     */
    const handlePaste = useCallback(
        (event: ClipboardEvent) => {
            const isVisible = checkComposerVisibility();
            const isFocused = textInput.current?.isFocused();
            const isContenteditableDivFocused = document.activeElement?.nodeName === 'DIV' && document.activeElement?.hasAttribute('contenteditable');

            if (!(isVisible || isFocused)) {
                return true;
            }

            if (textInput.current !== event.target && !(isContenteditableDivFocused && !event.clipboardData?.files.length)) {
                const eventTarget = event.target as HTMLInputElement | HTMLTextAreaElement | null;
                // To make sure the composer does not capture paste events from other inputs, we check where the event originated
                // If it did originate in another input, we return early to prevent the composer from handling the paste
                const isTargetInput = eventTarget?.nodeName === 'INPUT' || eventTarget?.nodeName === 'TEXTAREA' || eventTarget?.contentEditable === 'true';
                if (isTargetInput || (!isFocused && isContenteditableDivFocused && event.clipboardData?.files.length)) {
                    return true;
                }

                textInput.current?.focus();
            }

            event.preventDefault();

            const TEXT_HTML = 'text/html';

            const clipboardDataHtml = event.clipboardData?.getData(TEXT_HTML) ?? '';

            // If paste contains files, then trigger file management
            if (event.clipboardData?.files.length && event.clipboardData.files.length > 0) {
                // Prevent the default so we do not post the file name into the text box
                onPasteFile(event.clipboardData.files[0]);
                return true;
            }

            // If paste contains base64 image
            if (clipboardDataHtml?.includes(CONST.IMAGE_BASE64_MATCH)) {
                const domparser = new DOMParser();
                const pastedHTML = clipboardDataHtml;
                const embeddedImages = domparser.parseFromString(pastedHTML, TEXT_HTML)?.images;

                if (embeddedImages.length > 0 && embeddedImages[0].src) {
                    const src = embeddedImages[0].src;
                    const file = FileUtils.base64ToFile(src, 'image.png');
                    onPasteFile(file);
                    return true;
                }
            }

            // If paste contains image from Google Workspaces ex: Sheets, Docs, Slide, etc
            if (clipboardDataHtml?.includes(CONST.GOOGLE_DOC_IMAGE_LINK_MATCH)) {
                const domparser = new DOMParser();
                const pastedHTML = clipboardDataHtml;
                const embeddedImages = domparser.parseFromString(pastedHTML, TEXT_HTML).images;

                if (embeddedImages.length > 0 && embeddedImages[0]?.src) {
                    const src = embeddedImages[0].src;
                    if (src.includes(CONST.GOOGLE_DOC_IMAGE_LINK_MATCH)) {
                        fetch(src)
                            .then((response) => response.blob())
                            .then((blob) => {
                                const file = new File([blob], 'image.jpg', {type: 'image/jpeg'});
                                onPasteFile(file);
                            });
                        return true;
                    }
                }
            }
            return false;
        },
        [onPasteFile, checkComposerVisibility],
    );

    useEffect(() => {
        if (!textInput.current) {
            return;
        }
        const debouncedSetPrevScroll = lodashDebounce(() => {
            if (!textInput.current) {
                return;
            }
            setPrevScroll(textInput.current.scrollTop);
        }, 100);

        textInput.current.addEventListener('scroll', debouncedSetPrevScroll);
        return () => {
            textInput.current?.removeEventListener('scroll', debouncedSetPrevScroll);
        };
    }, []);

    useEffect(() => {
        const scrollingListener = DeviceEventEmitter.addListener(CONST.EVENTS.SCROLLING, (scrolling: boolean) => {
            isReportFlatListScrolling.current = scrolling;
        });

        return () => scrollingListener.remove();
    }, []);

    useEffect(() => {
        const handleWheel = (e: MouseEvent) => {
            if (isReportFlatListScrolling.current) {
                e.preventDefault();
                return;
            }
            e.stopPropagation();
        };
        textInput.current?.addEventListener('wheel', handleWheel, {passive: false});

        return () => {
            textInput.current?.removeEventListener('wheel', handleWheel);
        };
    }, []);

    useEffect(() => {
        if (!textInput.current || prevScroll === undefined) {
            return;
        }
        // eslint-disable-next-line react-compiler/react-compiler
        textInput.current.scrollTop = prevScroll;
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    }, [isComposerFullSize]);

    useHtmlPaste(textInput, handlePaste, true);

    useEffect(() => {
        setIsRendered(true);
    }, []);

    const clear = useCallback(() => {
        if (!textInput.current) {
            return;
        }

        const currentText = textInput.current.value;
        textInput.current.clear();

        // We need to reset the selection to 0,0 manually after clearing the text input on web
        const selectionEvent = {
            nativeEvent: {
                selection: {
                    start: 0,
                    end: 0,
                },
            },
        } as NativeSyntheticEvent<TextInputSelectionChangeEventData>;
        onSelectionChange(selectionEvent);
        setSelection({start: 0, end: 0});

        onClear(currentText);
    }, [onClear, onSelectionChange]);

    useImperativeHandle(
        ref,
        () => {
            const textInputRef = textInput.current;
            if (!textInputRef) {
                throw new Error('textInputRef is not available. This should never happen and indicates a developer error.');
            }

            return {
                ...textInputRef,
                // Overwrite clear with our custom implementation, which mimics how the native TextInput's clear method works
                clear,
                // We have to redefine these methods as they are inherited by prototype chain and are not accessible directly
                blur: () => textInputRef.blur(),
                focus: () => textInputRef.focus(),
                get scrollTop() {
                    return textInputRef.scrollTop;
                },
            };
        },
        [clear],
    );

    const handleKeyPress = useCallback(
        (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
            // Prevent onKeyPress from being triggered if the Enter key is pressed while text is being composed
            if (!onKeyPress || isEnterWhileComposition(e as unknown as KeyboardEvent)) {
                return;
            }

            onKeyPress(e);
        },
        [onKeyPress],
    );

    const renderElementForCaretPosition = (
        <View
            style={{
                position: 'absolute',
                zIndex: -1,
                opacity: 0,
            }}
        >
            <Text style={[StyleSheet.flatten([style, styles.noSelect]), StyleUtils.getComposerMaxHeightStyle(maxLines, isComposerFullSize), {maxWidth: textInputWidth}]}>
                {`${valueBeforeCaret} `}
                <Text
                    numberOfLines={1}
                    ref={textRef}
                >
                    {`${caretContent}`}
                </Text>
            </Text>
        </View>
    );

    const scrollStyleMemo = useMemo(() => {
        if (shouldContainScroll) {
            return isScrollBarVisible ? [styles.overflowScroll, styles.overscrollBehaviorContain] : styles.overflowHidden;
        }
        return styles.overflowAuto;
    }, [shouldContainScroll, styles.overflowAuto, styles.overflowScroll, styles.overscrollBehaviorContain, styles.overflowHidden, isScrollBarVisible]);

    const inputStyleMemo = useMemo(
        () => [
            StyleSheet.flatten([style, {outline: 'none'}]),
            StyleUtils.getComposeTextAreaPadding(isComposerFullSize),
            Browser.isMobileSafari() || Browser.isSafari() ? styles.rtlTextRenderForSafari : {},
            scrollStyleMemo,
            StyleUtils.getComposerMaxHeightStyle(maxLines, isComposerFullSize),
            isComposerFullSize ? {height: '100%', maxHeight: 'none'} : undefined,
            textContainsOnlyEmojis && hasMultipleLines ? styles.onlyEmojisTextLineHeight : {},
        ],

        [style, styles.rtlTextRenderForSafari, styles.onlyEmojisTextLineHeight, scrollStyleMemo, hasMultipleLines, StyleUtils, maxLines, isComposerFullSize, textContainsOnlyEmojis],
    );

    return (
        <>
            <RNMarkdownTextInput
                autoComplete="off"
                autoCorrect={!Browser.isMobileSafari()}
                placeholderTextColor={theme.placeholderText}
                ref={(el) => (textInput.current = el)}
                selection={selection}
                style={[inputStyleMemo]}
                markdownStyle={markdownStyle}
                value={value}
                defaultValue={defaultValue}
                autoFocus={autoFocus}
                /* eslint-disable-next-line react/jsx-props-no-spreading */
                {...props}
                onSelectionChange={addCursorPositionToSelectionChange}
                onContentSizeChange={(e) => {
                    setHasMultipleLines(e.nativeEvent.contentSize.height > variables.componentSizeLarge);
                    setTextInputWidth(`${e.nativeEvent.contentSize.width}px`);
                    updateIsFullComposerAvailable({maxLines, isComposerFullSize, isDisabled, setIsFullComposerAvailable}, e, styles);
                }}
                disabled={isDisabled}
                onKeyPress={handleKeyPress}
            />
            {shouldCalculateCaretPosition && renderElementForCaretPosition}
        </>
    );
}

Composer.displayName = 'Composer';

export default React.forwardRef(Composer);
