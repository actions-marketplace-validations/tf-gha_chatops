module.exports = async function ({ dir, github, context, glob, exec }) {
  if (context.payload.comment.body.match(/\/apply (\w+)/)) {
    return apply({ dir, github, context, glob, exec })
  }
}


async function apply ({ dir, github, context, glob, exec }) {
  const comment = await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: `[Applying Terraform here...](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`
  })

  const [ , env ] = context.payload.comment.body.match(/\/apply (\w+)/)

  await exec.exec(
    `terraform init -reconfigure -backend-config env/${env}.backend.tfvars`,
      [],
      { cwd: dir }
    )
  const apply = await exec.getExecOutput(
    `terraform apply -no-color -auto-approve -var-file env/${env}.tfvars`,
    [],
    { cwd: dir }
  )

  const commentUpdate = `<details><summary>Terraform Apply for ${env} ${apply.exitCode === 0 ? '🟢' : '🔴'}</summary>

\`\`\`terraform
${apply.stdout.split('\n').filter(v => !v.startsWith('::')).join('\n')}
\`\`\`
</details>

*Triggered By: @${ context.actor }, [Run available here](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})*`;

  await github.rest.issues.updateComment({
    comment_id: comment.data.id,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: commentUpdate,
  })

  if (apply.exitCode !== 0) process.exit(1)
}
