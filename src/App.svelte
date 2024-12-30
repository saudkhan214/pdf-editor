<script>
  import { Router, Route, navigate } from "svelte-routing";
  import Home from "./Home.svelte";
  import ProcessPdf from "./ProcessPdf.svelte";
  import EditPdf from "./EditPdf.svelte";
  import { onMount } from "svelte";
  import { config } from "./utils/config";

  // export let url = "";

  // // Force the router to reinitialize on page load or URL change
  // $: navigate(window.location.pathname, { replace: true });

  // onMount(() => {
  //   console.log("Current Path:", window.location.pathname);
  // });
  const production = config.ENV === "prod";
  console.log(production);

  const routes = {
    process: production ? "/pdf-contracts/processpdf" : "processpdf",
    edit: production
      ? "/pdf-contracts/editpdf/:resource_id"
      : "editpdf/:resource_id",
  };
</script>

<Router>
  <div>
    <Route path="/" component={Home} />
    <Route path={routes.process} component={ProcessPdf} />
    <Route path={routes.edit} component={EditPdf} />
  </div>
</Router>
