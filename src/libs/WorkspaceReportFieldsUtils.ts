import type {FormInputErrors} from '@components/Form/types';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type ONYXKEYS from '@src/ONYXKEYS';
import type {InputID} from '@src/types/form/WorkspaceReportFieldsForm';
import type {PolicyReportFieldType} from '@src/types/onyx/Policy';
import * as ErrorUtils from './ErrorUtils';
import * as Localize from './Localize';
import * as ValidationUtils from './ValidationUtils';

/**
 * Gets the translation key for the report field type
 */
function getReportFieldTypeTranslationKey(reportFieldType: PolicyReportFieldType): TranslationPaths {
    const typeTranslationKeysStrategy: Record<string, TranslationPaths> = {
        [CONST.REPORT_FIELD_TYPES.TEXT]: 'workspace.reportFields.textType',
        [CONST.REPORT_FIELD_TYPES.DATE]: 'workspace.reportFields.dateType',
        [CONST.REPORT_FIELD_TYPES.LIST]: 'workspace.reportFields.dropdownType',
    };

    return typeTranslationKeysStrategy[reportFieldType];
}

/**
 * Gets the translation key for the alternative text for the report field
 */
function getReportFieldAlternativeTextTranslationKey(reportFieldType: PolicyReportFieldType): TranslationPaths {
    const typeTranslationKeysStrategy: Record<string, TranslationPaths> = {
        [CONST.REPORT_FIELD_TYPES.TEXT]: 'workspace.reportFields.textAlternateText',
        [CONST.REPORT_FIELD_TYPES.DATE]: 'workspace.reportFields.dateAlternateText',
        [CONST.REPORT_FIELD_TYPES.LIST]: 'workspace.reportFields.dropdownAlternateText',
    };

    return typeTranslationKeysStrategy[reportFieldType];
}

/**
 * Validates the list value name
 */
function validateReportFieldListValueName(
    valueName: string,
    priorValueName: string,
    listValues: string[],
    inputID: InputID,
): FormInputErrors<typeof ONYXKEYS.FORMS.WORKSPACE_REPORT_FIELDS_FORM> {
    const errors: FormInputErrors<typeof ONYXKEYS.FORMS.WORKSPACE_REPORT_FIELDS_FORM> = {};

    if (!ValidationUtils.isRequiredFulfilled(valueName)) {
        errors[inputID] = Localize.translateLocal('workspace.reportFields.listValueRequiredError');
    } else if (priorValueName !== valueName && listValues.some((currentValueName) => currentValueName === valueName)) {
        errors[inputID] = Localize.translateLocal('workspace.reportFields.existingListValueError');
    } else if ([...valueName].length > CONST.WORKSPACE_REPORT_FIELD_POLICY_MAX_LENGTH) {
        // Uses the spread syntax to count the number of Unicode code points instead of the number of UTF-16 code units.
        ErrorUtils.addErrorMessage(
            errors,
            inputID,
            Localize.translateLocal('common.error.characterLimitExceedCounter', {length: [...valueName].length, limit: CONST.WORKSPACE_REPORT_FIELD_POLICY_MAX_LENGTH}),
        );
    }

    return errors;
}

export {getReportFieldTypeTranslationKey, getReportFieldAlternativeTextTranslationKey, validateReportFieldListValueName};
