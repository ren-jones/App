import type {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback} from 'react';
import {View} from 'react-native';
import CategoryPicker from '@components/CategoryPicker';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import type {ListItem} from '@components/SelectionList/types';
import TagPicker from '@components/TagPicker';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {DebugParamList} from '@libs/Navigation/types';
import {appendParam} from '@libs/Url';
import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';
import TRANSACTION_FORM_INPUT_IDS from '@src/types/form/DebugTransactionForm';
import ConstantPicker from './ConstantPicker';
import DebugTagPicker from './DebugTagPicker';

type DebugDetailsConstantPickerPageProps = StackScreenProps<DebugParamList, typeof SCREENS.DEBUG.DETAILS_CONSTANT_PICKER_PAGE>;

function DebugDetailsConstantPickerPage({
    route: {
        params: {formType, fieldName, fieldValue, policyID = '', backTo = ''},
    },
    navigation,
}: DebugDetailsConstantPickerPageProps) {
    const styles = useThemeStyles();
    const onSubmit = useCallback(
        (item: ListItem) => {
            const value = item.text === fieldValue ? '' : item.text ?? '';
            // Check the navigation state and "backTo" parameter to decide navigation behavior
            if (navigation.getState().routes.length === 1 && !backTo) {
                // If there is only one route and "backTo" is empty, go back in navigation
                Navigation.goBack();
            } else if (!!backTo && navigation.getState().routes.length === 1) {
                // If "backTo" is not empty and there is only one route, go back to the specific route defined in "backTo" with a country parameter
                Navigation.goBack(appendParam(backTo, fieldName, value));
            } else {
                // Otherwise, navigate to the specific route defined in "backTo" with a country parameter
                Navigation.navigate(appendParam(backTo, fieldName, value));
            }
        },
        [backTo, fieldName, fieldValue, navigation],
    );

    const renderPicker = useCallback(() => {
        if (formType === CONST.DEBUG.FORMS.TRANSACTION) {
            if (fieldName === TRANSACTION_FORM_INPUT_IDS.CATEGORY) {
                return (
                    <CategoryPicker
                        policyID={policyID}
                        selectedCategory={fieldValue}
                        onSubmit={onSubmit}
                    />
                );
            }
            if (fieldName === TRANSACTION_FORM_INPUT_IDS.TAG) {
                return (
                    <DebugTagPicker
                        policyID={policyID}
                        tagName={fieldValue}
                        onSubmit={onSubmit}
                    />
                );
            }
        }

        return (
            <ConstantPicker
                formType={formType}
                fieldName={fieldName}
                fieldValue={fieldValue}
                onSubmit={onSubmit}
            />
        );
    }, [fieldName, fieldValue, formType, onSubmit, policyID]);

    return (
        <ScreenWrapper testID={DebugDetailsConstantPickerPage.displayName}>
            <HeaderWithBackButton title={fieldName} />
            <View style={styles.containerWithSpaceBetween}>{renderPicker()}</View>
        </ScreenWrapper>
    );
}

DebugDetailsConstantPickerPage.displayName = 'DebugDetailsConstantPickerPage';

export default DebugDetailsConstantPickerPage;
