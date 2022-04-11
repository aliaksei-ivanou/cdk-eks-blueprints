import { Construct } from "constructs";
import { ArgoCDAddOn } from "../../../lib";
import { HelmChartDeployment } from "../helm-addon/kubectl-provider";
import { ClusterInfo } from "../../../lib/spi";
import { KubectlProvider } from '../helm-addon/kubectl-provider';
import { kebabToCamel } from "../../utils";

export class ArgoGitOpsFactory {

    public static enableGitOps() {
        KubectlProvider.applyHelmDeployment = createArgoHelmApplication;
    }

    public static enableGitOpsAppOfApps() {
        KubectlProvider.applyHelmDeployment = returnArgoHelmApplicationValues;
    }

}

export const createArgoHelmApplication = function (clusterInfo: ClusterInfo, helmDeployment: HelmChartDeployment): Construct {
    const argoAddOn = getArgoApplicationGenerator(clusterInfo);
    const values = helmDeployment.dependencyMode ? { [helmDeployment.name]: helmDeployment.values } : helmDeployment.values;
    return argoAddOn.generate(clusterInfo, {
        name: helmDeployment.name,
        namespace: helmDeployment.namespace,
        values: values,
    });
};

function getArgoApplicationGenerator(clusterInfo: ClusterInfo): ArgoCDAddOn {
    for (let addOn of clusterInfo.getResourceContext().blueprintProps.addOns ?? []) {
        const generator: any = addOn;
        if (generator instanceof ArgoCDAddOn) {
            return generator;
        }
    }
    throw Error("GitOps Engine is not defined in the blueprint");
}

export const returnArgoHelmApplicationValues = function (clusterInfo: ClusterInfo, helmDeployment: HelmChartDeployment): Construct {
    // Add `enabled` property to each addon
    helmDeployment.values.enabled = true;
    clusterInfo.addExecutionContext(
        kebabToCamel(helmDeployment.name),
        helmDeployment.values,
    );
    // No dependencies required because the values are used at postDeploy stage of ArgoCD AddOn.
    // Generate dummy construct to meet the function requirement.
    return new Construct(clusterInfo.cluster, `dummy${helmDeployment.name}`);
};
